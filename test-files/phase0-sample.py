# Test file for Phase 0 POC - Basic example with function calls and imports
from decimal import Decimal

def calculate_tax(price: float, region: str) -> float:
    """Calculate tax based on price and region."""
    rate = get_tax_rate(region)
    validated = validate_price(price)
    return validated * rate

def get_tax_rate(region: str) -> float:
    """Get tax rate for a region."""
    if region == 'US':
        return 0.1
    return 0.2

def validate_price(price: float) -> float:
    """Validate and return price."""
    if price < 0:
        raise ValueError("Price cannot be negative")
    return price
