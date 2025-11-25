import * as vscode from 'vscode';

/**
 * Simple diagnostic command to verify LSP is working
 */
export async function runDiagnostic() {
  console.log('[LLT Diagnostic] Starting diagnostic test...');
  
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }
  
  if (editor.document.languageId !== 'python') {
    vscode.window.showErrorMessage('Not a Python file');
    return;
  }
  
  console.log('[LLT Diagnostic] Document URI:', editor.document.uri.toString());
  console.log('[LLT Diagnostic] Document language:', editor.document.languageId);
  
  // Test 1: Can we get symbols?
  try {
    console.log('[LLT Diagnostic] Testing vscode.executeDocumentSymbolProvider...');
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      'vscode.executeDocumentSymbolProvider',
      editor.document.uri
    );
    
    console.log('[LLT Diagnostic] Symbols result:', symbols);
    if (symbols && symbols.length > 0) {
      console.log('[LLT Diagnostic] First symbol:', JSON.stringify(symbols[0], null, 2));
      vscode.window.showInformationMessage(`Found ${symbols.length} symbols`);
    } else {
      console.log('[LLT Diagnostic] No symbols found');
      vscode.window.showWarningMessage('No symbols found');
    }
  } catch (error) {
    console.error('[LLT Diagnostic] Error getting symbols:', error);
    vscode.window.showErrorMessage(`Error: ${error}`);
  }
  
  // Test 2: Can we show output?
  console.log('[LLT Diagnostic] Testing output channel...');
  const channel = vscode.window.createOutputChannel('LLT Diagnostic');
  channel.appendLine('Diagnostic test completed');
  channel.show();
}
