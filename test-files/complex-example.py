"""
Phase 0 Complex Test Case
Testing: classes, nested calls, decorators, complex imports
"""

import json
import os.path as osp
from typing import List, Dict, Optional, Union
from datetime import datetime, timedelta

class DataProcessor:
    def __init__(self, data_dir: str):
        self.data_dir = osp.abspath(data_dir)
        self.cache: Dict[str, List] = {}
    
    def load_data(self, filename: str) -> Optional[List]:
        """Load and parse JSON data file."""
        filepath = osp.join(self.data_dir, filename)
        
        if not osp.exists(filepath):
            return None
        
        try:
            content = self._read_file(filepath)
            parsed = self._parse_json(content)
            validated = self._validate_data(parsed)
            return validated
        except Exception:
            return None
    
    def _read_file(self, path: str) -> str:
        """Read file content."""
        with open(path, 'r') as f:
            return f.read()
    
    def _parse_json(self, content: str) -> Union[List, Dict]:
        """Parse JSON string."""
        return json.loads(content)
    
    def _validate_data(self, data: Union[List, Dict]) -> Optional[List]:
        """Validate data structure."""
        if not isinstance(data, list):
            return None
        
        if len(data) == 0:
            return []
        
        return data

def process_with_timing(processor: DataProcessor, filename: str) -> tuple[Optional[List], float]:
    """Process data and measure execution time."""
    start_time = datetime.now()
    result = processor.load_data(filename)
    end_time = datetime.now()
    
    duration = (end_time - start_time).total_seconds()
    return result, duration

def batch_process(processor: DataProcessor, files: List[str]) -> Dict[str, Optional[List]]:
    """Process multiple files."""
    results = {}
    
    for filename in files:
        results[filename] = processor.load_data(filename)
    
    return results
