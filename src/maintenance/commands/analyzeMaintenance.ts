/**
 * Analyze Maintenance Command
 * Main command handler for maintenance analysis
 */

import * as vscode from 'vscode';
import { GitCommitWatcher } from '../git/commitWatcher';
import { GitDiffAnalyzer } from '../git/diffAnalyzer';
import { MaintenanceBackendClient } from '../api/maintenanceClient';
import { MaintenanceTreeProvider } from '../ui/maintenanceTreeProvider';
import { DiffViewer } from '../ui/diffViewer';
import { DecisionDialogManager } from '../ui/decisionDialog';
import { MaintenanceResult, CodeChange } from '../models/types';
import { AnalyzeMaintenanceRequest, AnalyzeMaintenanceResponse } from '../api/types';

/**
 * Analyze Maintenance Command
 */
export class AnalyzeMaintenanceCommand {
	constructor(
		private client: MaintenanceBackendClient,
		private treeProvider: MaintenanceTreeProvider,
		private diffAnalyzer: GitDiffAnalyzer,
		private decisionDialog: DecisionDialogManager
	) {}

	/**
	 * Execute the analyze maintenance command
	 */
	async execute(): Promise<void> {
		try {
			// Get workspace root
			const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
			if (!workspaceRoot) {
				vscode.window.showErrorMessage('No workspace folder open');
				return;
			}

			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Analyzing maintenance...',
					cancellable: false
				},
				async (progress) => {
					try {
						// Step 1: Check backend health
						progress.report({ message: 'Checking backend connection...', increment: 10 });
						try {
							const isHealthy = await this.client.checkHealth();
							if (!isHealthy) {
								const action = await vscode.window.showWarningMessage(
									'Backend is not responding. Please check your connection and backend URL.',
									'Retry',
									'Open Settings'
								);
								
								if (action === 'Retry') {
									// Retry health check
									const retryHealthy = await this.client.checkHealth();
									if (!retryHealthy) {
										return;
									}
								} else if (action === 'Open Settings') {
									vscode.commands.executeCommand('workbench.action.openSettings', 'llt-assistant.maintenance.backendUrl');
									return;
								} else {
									return;
								}
							}
						} catch (error) {
							const action = await vscode.window.showErrorMessage(
								`Failed to connect to backend: ${error instanceof Error ? error.message : String(error)}`,
								'Retry',
								'Open Settings'
							);
							
							if (action === 'Retry') {
								await this.execute();
							} else if (action === 'Open Settings') {
								vscode.commands.executeCommand('workbench.action.openSettings', 'llt-assistant.maintenance.backendUrl');
							}
							return;
						}

						// Step 2: Get current and previous commit hashes
						progress.report({ message: 'Getting commit information...', increment: 20 });
						const commitWatcher = new GitCommitWatcher(workspaceRoot);
						const currentCommitHash = commitWatcher.getCurrentCommitHash();
						const previousCommitHash = commitWatcher.getPreviousCommitHash();

						if (!currentCommitHash) {
							vscode.window.showWarningMessage('Not a git repository or no commits found');
							return;
						}

						if (!previousCommitHash) {
							vscode.window.showInformationMessage(
								'This appears to be the first commit. No previous commit to compare.'
							);
							return;
						}

						// Step 3: Analyze commit diff
						progress.report({ message: 'Analyzing code changes...', increment: 30 });
						const codeChanges = await this.diffAnalyzer.analyzeCommitDiff(
							previousCommitHash,
							currentCommitHash
						);

						if (codeChanges.size === 0) {
							vscode.window.showInformationMessage('No code changes detected');
							this.treeProvider.clear();
							return;
						}

						// Step 4: Convert to request format
						progress.report({ message: 'Preparing analysis request...', increment: 40 });
						const changes: CodeChange[] = Array.from(codeChanges.values());

						const request: AnalyzeMaintenanceRequest = {
							commit_hash: currentCommitHash,
							previous_commit_hash: previousCommitHash,
							changes
						};

						// Step 5: Send to backend for analysis
						progress.report({ message: 'Identifying affected tests...', increment: 50 });
						
						let response: AnalyzeMaintenanceResponse;
						try {
							response = await this.client.analyzeMaintenance(request);
						} catch (error) {
							// Re-throw to be handled by outer catch block
							throw error;
						}

						// Step 6: Build result
						progress.report({ message: 'Building analysis results...', increment: 80 });
						const changeSummary = this.diffAnalyzer.generateChangeSummary(codeChanges);

						const result: MaintenanceResult = {
							context_id: response.context_id,
							commit_hash: currentCommitHash,
							previous_commit_hash: previousCommitHash,
							affected_tests: response.affected_tests,
							change_summary: {
								...changeSummary,
								functions_changed: response.change_summary.functions_changed || changeSummary.functions_changed
							},
							code_changes: changes,
							timestamp: Date.now()
						};

						// Step 7: Update tree view
						progress.report({ message: 'Displaying results...', increment: 100 });
						this.treeProvider.refresh(result);

						// Step 8: Show summary and ask for user decision
						const testsAffected = result.affected_tests.length;
						const summaryMessage = `Maintenance analysis complete: ${testsAffected} test(s) affected`;

						if (testsAffected > 0) {
							// Show diff for first changed file
							if (changes.length > 0) {
								const firstChange = changes[0];
								const diff = await this.diffAnalyzer.getCodeDiff(
									firstChange.file_path,
									previousCommitHash,
									currentCommitHash
								);

								if (diff) {
									// Show diff in a non-blocking way
									setTimeout(() => {
										DiffViewer.showDiff(diff, `Changes in ${firstChange.file_path}`);
									}, 500);
								}
							}

							// Ask user for decision
							const decision = await this.decisionDialog.showDecisionDialog(result);

							if (decision.decision === 'cancelled') {
								vscode.window.showInformationMessage('Maintenance analysis cancelled');
								return;
							}

							// Store decision in context for batch fix command
							// The decision is stored in the tree provider's metadata
							// User can use "Batch Fix Tests" command to apply fixes
							if (decision.decision === 'functionality_changed') {
								vscode.window.showInformationMessage(
									`Decision recorded. Use "Batch Fix Tests" command to regenerate ${decision.selected_tests?.length || testsAffected} test(s).`
								);
							} else {
								vscode.window.showInformationMessage(
									`Decision recorded. Use "Batch Fix Tests" command to improve coverage for ${decision.selected_tests?.length || testsAffected} test(s).`
								);
							}
						} else {
							vscode.window.showInformationMessage(summaryMessage);
						}
					} catch (error) {
						console.error('[Maintenance] Error during analysis:', error);
						
						// Handle backend errors with detailed messages
						if (error && typeof error === 'object' && 'type' in error) {
							const backendError = error as any;
							let errorMessage = 'Maintenance analysis failed: ';
							
							switch (backendError.type) {
								case 'network':
									errorMessage += 'Cannot connect to backend. Please check your network connection and backend URL.';
									break;
								case 'timeout':
									errorMessage += 'Request timed out. The backend may be slow or unavailable.';
									break;
								case 'validation':
									errorMessage += 'Invalid request. Please check your Git repository and try again.';
									break;
								case 'server':
									errorMessage += 'Backend server error. Please try again later or contact support.';
									break;
								default:
									errorMessage += backendError.message || 'Unknown error occurred.';
							}
							
							if (backendError.detail) {
								errorMessage += `\nDetails: ${backendError.detail}`;
							}
							
							vscode.window.showErrorMessage(errorMessage, 'Retry', 'Open Settings').then(selection => {
								if (selection === 'Retry') {
									this.execute();
								} else if (selection === 'Open Settings') {
									vscode.commands.executeCommand('workbench.action.openSettings', 'llt-assistant.maintenance.backendUrl');
								}
							});
						} else {
							vscode.window.showErrorMessage(
								`Maintenance analysis failed: ${error instanceof Error ? error.message : String(error)}`
							);
						}
					}
				}
			);
		} catch (error) {
			console.error('[Maintenance] Error in analyze maintenance command:', error);
			vscode.window.showErrorMessage(
				`Failed to analyze maintenance: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}
}

