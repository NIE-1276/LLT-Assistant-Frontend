/**
 * Batch Fix Command
 * Handles batch fixing of affected test cases
 */

import * as vscode from 'vscode';
import { MaintenanceBackendClient } from '../api/maintenanceClient';
import { MaintenanceTreeProvider } from '../ui/maintenanceTreeProvider';
import { MaintenanceResult, AffectedTestCase, BatchFixResult, UserDecisionType } from '../models/types';
import { BatchFixRequest } from '../api/types';
import { BackendAgentController } from '../../agents';
import { TestGenerationController } from '../../generation';
import { PythonASTAnalyzer } from '../../analysis';
import { ConfigurationManager } from '../../api';
import * as path from 'path';

/**
 * Batch Fix Command
 */
export class BatchFixCommand {
	constructor(
		private client: MaintenanceBackendClient,
		private treeProvider: MaintenanceTreeProvider
	) {}

	/**
	 * Execute batch fix based on user decision
	 * @param decision User decision (functionality_changed or refactor_only)
	 * @param userDescription Optional description for functionality changes
	 */
	async execute(
		decision: UserDecisionType,
		userDescription?: string,
		selectedTests?: AffectedTestCase[]
	): Promise<void> {
		try {
			const result = this.treeProvider.getAnalysisResult();
			if (!result) {
				vscode.window.showWarningMessage(
					'No maintenance analysis available. Run "Analyze Maintenance" first.'
				);
				return;
			}

			// Use selected tests or all affected tests
			const testsToFix = selectedTests || result.affected_tests;

			if (testsToFix.length === 0) {
				vscode.window.showInformationMessage('No tests selected for fixing');
				return;
			}

			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: decision === 'functionality_changed' ? 'Regenerating tests...' : 'Improving test coverage...',
					cancellable: false
				},
				async (progress) => {
					try {
						if (decision === 'functionality_changed') {
							await this.regenerateTests(testsToFix, result, userDescription || '', progress);
						} else if (decision === 'refactor_only') {
							await this.improveCoverage(testsToFix, result, progress);
						}
					} catch (error) {
						console.error('[Maintenance] Error during batch fix:', error);
						vscode.window.showErrorMessage(
							`Batch fix failed: ${error instanceof Error ? error.message : String(error)}`
						);
					}
				}
			);
		} catch (error) {
			console.error('[Maintenance] Error in batch fix command:', error);
			vscode.window.showErrorMessage(
				`Failed to batch fix tests: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Regenerate tests for functionality changes
	 */
	private async regenerateTests(
		tests: AffectedTestCase[],
		result: MaintenanceResult,
		userDescription: string,
		progress: vscode.Progress<{ message?: string; increment?: number }>
	): Promise<void> {
		const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
		if (!workspaceRoot) {
			throw new Error('No workspace folder open');
		}

		// Initialize components
		const configManager = new ConfigurationManager();
		const backendUrl = configManager.getBackendUrl();
		const backendController = new BackendAgentController(backendUrl);
		const testGenerator = new TestGenerationController();
		const astAnalyzer = new PythonASTAnalyzer();

		let successCount = 0;
		let failCount = 0;

		// Process each test
		for (let i = 0; i < tests.length; i++) {
			const test = tests[i];

			progress.report({
				message: `Regenerating test ${i + 1}/${tests.length}: ${test.test_name}`,
				increment: (100 / tests.length)
			});

			try {
				// Find source file and function
				const sourceFile = test.source_file || this.findSourceFile(test, result);
				const functionName = test.source_function || this.extractFunctionName(test);

				if (!sourceFile) {
					console.error(`Cannot find source file for test ${test.test_name}`);
					failCount++;
					continue;
				}

				const fullSourcePath = path.join(workspaceRoot, sourceFile);

				// Build function context
				const analysisResult = await astAnalyzer.buildFunctionContext(
					fullSourcePath,
					functionName
				);

				if (!analysisResult.success || !analysisResult.data) {
					console.error(`Failed to analyze function for ${test.test_name}`);
					failCount++;
					continue;
				}

				const functionContext = analysisResult.data;

				// Generate test using backend
				let pipelineResult;
				try {
					pipelineResult = await backendController.runFullPipeline(
						functionContext,
						userDescription || `Regenerate test for ${functionName}`,
						async () => {
							// Auto-confirm
							return { confirmed: true, cancelled: false };
						}
					);
				} catch (error) {
					console.error(`Failed to generate test for ${test.test_name}:`, error);
					failCount++;
					continue;
				}

				if (!pipelineResult.success || !pipelineResult.stage2Response) {
					console.error(`Failed to generate test for ${test.test_name}`);
					failCount++;
					continue;
				}

				// Generate and insert test
				const generationResult = await testGenerator.generateAndInsertTests(
					pipelineResult.stage2Response,
					functionContext,
					fullSourcePath
				);

				if (generationResult.success) {
					successCount++;
				} else {
					failCount++;
				}
			} catch (error) {
				console.error(`Error regenerating test ${test.test_name}:`, error);
				failCount++;
			}
		}

		// Show detailed summary
		if (successCount > 0) {
			const message = `✅ ${successCount} test(s) regenerated successfully` +
				(failCount > 0 ? `, ${failCount} failed` : '');
			
			if (failCount > 0) {
				vscode.window.showWarningMessage(
					message,
					'View Details'
				).then(selection => {
					if (selection === 'View Details') {
						// Show output channel with details
						const outputChannel = vscode.window.createOutputChannel('LLT Maintenance');
						outputChannel.appendLine('Test Regeneration Summary:');
						outputChannel.appendLine(`✅ Success: ${successCount}`);
						outputChannel.appendLine(`❌ Failed: ${failCount}`);
						outputChannel.show();
					}
				});
			} else {
				vscode.window.showInformationMessage(message);
			}
		} else {
			vscode.window.showWarningMessage(
				'No tests were regenerated. Please check the console for details.',
				'View Console'
			).then(selection => {
				if (selection === 'View Console') {
					vscode.commands.executeCommand('workbench.action.output.toggleOutput');
				}
			});
		}
	}

	/**
	 * Improve coverage for refactoring
	 */
	private async improveCoverage(
		tests: AffectedTestCase[],
		result: MaintenanceResult,
		progress: vscode.Progress<{ message?: string; increment?: number }>
	): Promise<void> {
		// Prepare batch fix request
		const request: BatchFixRequest = {
			action: 'improve_coverage',
			tests: tests.map(test => ({
				test_file: test.test_file,
				test_name: test.test_name,
				test_class: test.test_class,
				function_name: test.source_function || '',
				source_file: test.source_file || ''
			}))
		};

		progress.report({ message: 'Sending request to backend...', increment: 30 });

		try {
			const response = await this.client.batchFixTests(request);

			progress.report({ message: 'Processing results...', increment: 80 });

			const successCount = response.results.filter(r => r.success).length;
			const failCount = response.results.filter(r => !r.success).length;

			// Process results and apply fixes
			progress.report({ message: 'Applying fixes to test files...', increment: 90 });

			// Apply successful fixes to files
			const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
			if (workspaceRoot) {
				for (const result of response.results) {
					if (result.success && result.new_code) {
						try {
							const testFilePath = path.join(workspaceRoot, result.test_file);
							const testFileUri = vscode.Uri.file(testFilePath);
							
							// Open and update the test file
							const document = await vscode.workspace.openTextDocument(testFileUri);
							const editor = await vscode.window.showTextDocument(document);
							
							// Find the test function and replace it
							const text = document.getText();
							const testFunctionRegex = new RegExp(
								`(def\\s+${result.test_name}\\s*\\([^)]*\\):.*?)(?=\\n\\n\\s*def|\\n\\n\\s*class|$)`,
								's'
							);
							
							const match = text.match(testFunctionRegex);
							if (match) {
								const edit = new vscode.WorkspaceEdit();
								const startPos = document.positionAt(text.indexOf(match[1]));
								const endPos = document.positionAt(text.indexOf(match[1]) + match[1].length);
								edit.replace(testFileUri, new vscode.Range(startPos, endPos), result.new_code);
								await vscode.workspace.applyEdit(edit);
							} else {
								// If test function not found, append at the end
								const edit = new vscode.WorkspaceEdit();
								const endPos = document.positionAt(text.length);
								edit.insert(testFileUri, endPos, `\n\n${result.new_code}`);
								await vscode.workspace.applyEdit(edit);
							}
						} catch (error) {
							console.error(`Failed to apply fix to ${result.test_file}:`, error);
						}
					}
				}
			}

			progress.report({ message: 'Complete', increment: 100 });

			// Show detailed summary
			if (successCount > 0) {
				const message = `✅ Coverage improved for ${successCount} test(s)` +
					(failCount > 0 ? `, ${failCount} failed` : '');
				
				// Show detailed results if there are failures
				if (failCount > 0) {
					const failedTests = response.results
						.filter(r => !r.success)
						.map(r => `${r.test_name}${r.error ? `: ${r.error}` : ''}`)
						.join('\n');
					
					vscode.window.showInformationMessage(
						message,
						'View Details'
					).then(selection => {
						if (selection === 'View Details') {
							const outputChannel = vscode.window.createOutputChannel('LLT Maintenance');
							outputChannel.appendLine('Coverage Improvement Summary:');
							outputChannel.appendLine(`✅ Success: ${successCount}`);
							outputChannel.appendLine(`❌ Failed: ${failCount}`);
							if (failedTests) {
								outputChannel.appendLine('\nFailed tests:');
								outputChannel.appendLine(failedTests);
							}
							outputChannel.show();
						}
					});
				} else {
					vscode.window.showInformationMessage(message);
				}
			} else {
				const errorDetails = response.results
					.filter(r => !r.success && r.error)
					.map(r => `${r.test_name}: ${r.error}`)
					.join('\n');
				
				vscode.window.showWarningMessage(
					'No tests were improved' + (errorDetails ? `\n\nErrors:\n${errorDetails}` : ''),
					'View Details'
				).then(selection => {
					if (selection === 'View Details') {
						const outputChannel = vscode.window.createOutputChannel('LLT Maintenance');
						outputChannel.appendLine('Coverage Improvement Failed:');
						outputChannel.appendLine(errorDetails || 'Unknown error');
						outputChannel.show();
					}
				});
			}
		} catch (error) {
			// Handle backend errors with detailed messages
			if (error && typeof error === 'object' && 'type' in error) {
				const backendError = error as any;
				let errorMessage = 'Backend request failed: ';
				
				switch (backendError.type) {
					case 'network':
						errorMessage += 'Cannot connect to backend. Please check your network connection.';
						break;
					case 'timeout':
						errorMessage += 'Request timed out. The operation may take longer than expected.';
						break;
					case 'validation':
						errorMessage += 'Invalid request. Please check the selected tests and try again.';
						break;
					case 'server':
						errorMessage += 'Backend server error. Please try again later.';
						break;
					default:
						errorMessage += backendError.message || 'Unknown error occurred.';
				}
				
				throw new Error(errorMessage);
			} else {
				throw new Error(`Backend request failed: ${error instanceof Error ? error.message : String(error)}`);
			}
		}
	}

	/**
	 * Find source file for a test
	 */
	private findSourceFile(test: AffectedTestCase, result: MaintenanceResult): string | null {
		// Try to match test file to source file
		const testFileName = test.test_file.split('/').pop() || '';
		const expectedSourceFileName = testFileName.replace(/^test_/, '').replace(/_test\.py$/, '.py');

		// Look in code changes
		for (const change of result.code_changes) {
			const sourceFileName = change.file_path.split('/').pop() || '';
			if (sourceFileName === expectedSourceFileName) {
				return change.file_path;
			}
		}

		// Fallback: use first changed file
		if (result.code_changes.length > 0) {
			return result.code_changes[0].file_path;
		}

		return null;
	}

	/**
	 * Extract function name from test
	 */
	private extractFunctionName(test: AffectedTestCase): string {
		// Infer from test name: test_add -> add
		return test.test_name.replace(/^test_/, '');
	}
}

