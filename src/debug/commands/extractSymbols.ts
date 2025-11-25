import * as vscode from 'vscode';
import * as path from 'path';

interface FunctionInfo {
  name: string;
  kind: string;
  signature: string;
  line_start: number;
  line_end: number;
  calls: string[];
  decorates: string[];
  detail?: string;
}

interface ImportInfo {
  module: string;
  imported_names: string[];
  alias: string | null;
}

interface ExtractionResult {
  file_path: string;
  extraction_time_ms: number;
  functions: FunctionInfo[];
  imports: ImportInfo[];
}

/**
 * Extract symbols from the current Python file
 * This is a debug command for Phase 0 POC (Proof of Concept)
 */
export async function extractSymbolsCommand() {
  console.log('[LLT Debug] Starting symbol extraction...');
  const startTime = Date.now();
  const editor = vscode.window.activeTextEditor;
  
  // Check if there's an active editor
  if (!editor) {
    vscode.window.showErrorMessage('No active editor found');
    console.error('[LLT Debug] No active editor found');
    return;
  }
  
  const document = editor.document;
  const filePath = document.uri.fsPath;
  console.log(`[LLT Debug] Extracting from: ${filePath}`);
  
  // Check if it's a Python file (more thorough check)
  const languageId = document.languageId;
  const filename = path.basename(filePath);
  const isPython = languageId === 'python' || filename.endsWith('.py');
  
  if (!isPython) {
    vscode.window.showErrorMessage(`Not a Python file (language: ${languageId}, file: ${filename})`);
    console.error(`[LLT Debug] Not a Python file: language=${languageId}, filename=${filename}`);
    return;
  }
  
  // Additional check: verify VSCode recognizes it as Python
  if (languageId !== 'python') {
    vscode.window.showWarningMessage(
      'File does not have Python language mode. Please ensure the Python extension is active.',
      'Open Python Extension'
    ).then(selection => {
      if (selection === 'Open Python Extension') {
        vscode.commands.executeCommand('extension.open', 'ms-python.python');
      }
    });
    return;
  }
  
  try {
    // Step 1: Extract symbols using LSP, with retry logic
    vscode.window.showInformationMessage('Extracting symbols from current file...');
    
    let symbols: vscode.DocumentSymbol[] | undefined;
    let attempts = 0;
    const maxAttempts = 3;
    
    // Retry loop - LSP might not be ready immediately
    while (attempts < maxAttempts) {
      console.log(`[LLT Debug] Calling vscode.executeDocumentSymbolProvider (attempt ${attempts + 1}/${maxAttempts})...`);
      symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        document.uri
      );
      
      if (symbols && symbols.length > 0) {
        break; // Success!
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        console.log(`[LLT Debug] No symbols found, waiting 500ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`[LLT Debug] Symbols received: ${symbols ? symbols.length : 0} symbols`);
    
    if (!symbols || symbols.length === 0) {
      // Provide helpful troubleshooting message
      const troubleshooting = `
No symbols found. Common causes:
1. Python Language Server not ready - Try waiting a few seconds and run again
2. File not recognized as Python - Check bottom-right language indicator
3. Python extension not active - Ensure Python extension is installed and enabled
4. Syntax errors in file - Check for red squiggly lines
5. Large workspace - LSP may take time to initialize

Suggestions:
• Make a small edit to the file and save it
• Wait 5-10 seconds for Python LSP to initialize
• Run "Python: Select Interpreter" command
• Try closing and reopening the file
      `;
      
      console.warn('[LLT Debug] No symbols found. Troubleshooting:', troubleshooting);
      
      vscode.window.showWarningMessage(
        'No symbols found. Python LSP may not be ready.',
        'Show Details', 'Try Again'
      ).then(selection => {
        if (selection === 'Show Details') {
          const channel = vscode.window.createOutputChannel('LLT Assistant');
          channel.clear();
          channel.appendLine('=== No Symbols Found - Troubleshooting ===');
          channel.appendLine(troubleshooting);
          channel.show();
        } else if (selection === 'Try Again') {
          extractSymbolsCommand(); // Retry
        }
      });
      
      return;
    }
    
    // Log raw symbols for debugging
    console.log('[LLT Debug] Raw symbols:', JSON.stringify(symbols, null, 2).substring(0, 1000));
    
    vscode.window.showInformationMessage(`Found ${symbols.length} symbols, processing...`);
    
    // Step 2: Parse import statements
    console.log('[LLT Debug] Parsing import statements...');
    const imports = parseImportStatements(document.getText());
    console.log(`[LLT Debug] Imports found: ${imports.length}`);
    
    // Step 3: Extract function information
    console.log('[LLT Debug] Extracting function information...');
    const functionInfos = await extractFunctionInfos(document, symbols);
    console.log(`[LLT Debug] Functions extracted: ${functionInfos.length}`);
    
    if (functionInfos.length === 0) {
      vscode.window.showWarningMessage('No functions found in symbols');
      console.warn('[LLT Debug] No functions extracted from symbols');
    }
    
    // Step 4: Build result
    const extractionTime = Date.now() - startTime;
    const result: ExtractionResult = {
      file_path: filePath,
      extraction_time_ms: extractionTime,
      functions: functionInfos,
      imports: imports
    };
    
    // Step 5: Output to LLT output channel
    console.log('[LLT Debug] Creating output channel...');
    const outputChannel = vscode.window.createOutputChannel('LLT Assistant');
    outputChannel.clear();
    outputChannel.appendLine('=== LLT Phase 0 - Symbol Extraction Debug Output ===');
    outputChannel.appendLine(JSON.stringify(result, null, 2));
    outputChannel.show();
    
    vscode.window.showInformationMessage(`Symbol extraction completed in ${extractionTime}ms`);
    console.log('[LLT Debug] Extraction completed successfully');
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Error extracting symbols: ${errorMsg}`);
    console.error('[LLT Debug] Error:', errorMsg);
    if (error instanceof Error) {
      console.error('[LLT Debug] Stack trace:', error.stack);
    }
  }
}

/**
 * Parse import statements from Python source code
 */
function parseImportStatements(sourceCode: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const lines = sourceCode.split('\n');
  
  for (const line of lines) {
    const lineTrim = line.trim();
    
    // Skip comments and empty lines
    if (!lineTrim || lineTrim.startsWith('#')) {
      continue;
    }
    
    // Simple import: import module
    const simpleImportMatch = lineTrim.match(/^import\s+([a-zA-Z_][a-zA-Z0-9_.]*)(?:\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*))?$/);
    if (simpleImportMatch) {
      imports.push({
        module: simpleImportMatch[1],
        imported_names: [],
        alias: simpleImportMatch[2] || null
      });
      continue;
    }
    
    // From import: from module import name1, name2
    const fromImportMatch = lineTrim.match(/^from\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+import\s+(.+)$/);
    if (fromImportMatch) {
      const module = fromImportMatch[1];
      const importedNamesRaw = fromImportMatch[2];
      
      // Handle comma-separated names
      const importedNames = importedNamesRaw.split(',').map(name => name.trim()).filter(name => name !== '');
      
      imports.push({
        module: module,
        imported_names: importedNames,
        alias: null
      });
      continue;
    }
    
    // Stop at first function/class definition (assuming imports are at top)
    if (lineTrim.startsWith('def ') || lineTrim.startsWith('class ')) {
      break;
    }
  }
  
  return imports;
}

/**
 * Extract function information from symbols
 */
async function extractFunctionInfos(
  document: vscode.TextDocument, 
  symbols: vscode.DocumentSymbol[]
): Promise<FunctionInfo[]> {
  const functionInfos: FunctionInfo[] = [];
  
  // Recursively traverse all symbols
  function traverse(symbols: vscode.DocumentSymbol[]) {
    for (const symbol of symbols) {
      if (symbol.kind === vscode.SymbolKind.Function || symbol.kind === vscode.SymbolKind.Method) {
        const info = extractFunctionInfo(document, symbol);
        if (info) {
          functionInfos.push(info);
        }
      }
      
      // Recursively process children
      if (symbol.children && symbol.children.length > 0) {
        traverse(symbol.children);
      }
    }
  }
  
  traverse(symbols);
  return functionInfos;
}

/**
 * Extract detailed information for a single function
 */
function extractFunctionInfo(
  document: vscode.TextDocument,
  symbol: vscode.DocumentSymbol
): FunctionInfo {
  try {
    // Get function name and location
    const functionName = symbol.name;
    const lineStart = symbol.range.start.line;
    const lineEnd = symbol.range.end.line;
    
    // Try to extract signature from the document text
    const functionLine = document.lineAt(symbol.selectionRange.start.line).text;
    const signatureMatch = functionLine.match(/def\s+\w+\s*\((.*?)\)(?:\s*->\s*(.+?))?:/);
    const paramList = signatureMatch ? signatureMatch[1] : '';
    const returnType = signatureMatch && signatureMatch[2] ? signatureMatch[2].trim() : '';
    
    // Build signature string
    let signature = `(${paramList})`;
    if (returnType) {
      signature += ` -> ${returnType}`;
    }
    
    // Extract function body to find calls
    const functionRange = new vscode.Range(
      symbol.range.start.line,
      0,
      symbol.range.end.line,
      document.lineAt(symbol.range.end.line).text.length
    );
    const functionText = document.getText(functionRange);
    
    // Extract function calls (simple pattern matching)
    const calls = extractFunctionCalls(functionText);
    
    return {
      name: functionName,
      kind: symbol.kind === vscode.SymbolKind.Method ? 'method' : 'function',
      signature: signature,
      line_start: lineStart,
      line_end: lineEnd,
      calls: calls,
      decorates: [], // Would extract decorators if needed
      detail: symbol.detail
    };
  } catch (error) {
    console.error(`[LLT Debug] Error extracting function info for ${symbol.name}:`, error);
    return {
      name: symbol.name,
      kind: 'function',
      signature: '()',
      line_start: symbol.range.start.line,
      line_end: symbol.range.end.line,
      calls: [],
      decorates: [],
      detail: symbol.detail
    };
  }
}

/**
 * Extract function calls using pattern matching
 * Note: This is a simple approach for Phase 0 POC
 */
function extractFunctionCalls(functionText: string): string[] {
  const calls: string[] = [];
  
  // Match function calls: function_name( or obj.method(
  const callPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  const lines = functionText.split('\n').filter(line => {
    const trimmed = line.trim();
    // Skip function definition line and comments
    return !trimmed.startsWith('def ') && !trimmed.startsWith('#');
  });
  
  for (const line of lines) {
    let match;
    while ((match = callPattern.exec(line)) !== null) {
      const functionName = match[1];
      // Skip obvious Python keywords and built-ins that aren't likely to be mocked
      const skipList = ['if', 'elif', 'else', 'for', 'while', 'return', 'print', 'len', 'range', 'enumerate', 'zip', 'map', 'filter', 'str', 'int', 'float', 'bool'];
      if (!skipList.includes(functionName) && !calls.includes(functionName)) {
        calls.push(functionName);
      }
    }
  }
  
  return calls;
}
