/**
 * Utility to accurately extract travel destination, study subject, or project domain from prompts
 */

function extractDestination(text = '') {
  const query = text.trim();

  // Known city/region overrides
  if (/mumbai|bombay/i.test(query)) return 'Mumbai';
  if (/goa/i.test(query)) return 'Goa';
  if (/delhi|new delhi/i.test(query)) return 'Delhi';
  if (/bangalore|bengaluru/i.test(query)) return 'Bengaluru';
  if (/kerala/i.test(query)) return 'Kerala';
  if (/america|usa|united states|new york|california|los angeles|san francisco|las vegas/i.test(query)) return 'United States';
  if (/japan|tokyo|kyoto|osaka/i.test(query)) return 'Japan';
  if (/paris|france/i.test(query)) return 'Paris';
  if (/bali|indonesia/i.test(query)) return 'Bali';
  if (/london|uk|united kingdom/i.test(query)) return 'London';
  if (/switzerland|swiss|alps/i.test(query)) return 'Switzerland';
  if (/dubai|uae/i.test(query)) return 'Dubai';
  if (/singapore/i.test(query)) return 'Singapore';

  // Generic extraction: "to [Destination]" or "in [Destination]" or "visit [Destination]"
  const match = query.match(/(?:trip|travel|visit|flight|tour|vacation|itinerary)\s+(?:to|in|for)?\s*([A-Za-z\s]+?)(?:\s+for\s+\d+|\s+in\s+\d+|\s+with\s+|\s*$)/i);
  if (match && match[1]) {
    const raw = match[1].trim();
    if (raw.length > 1 && !/^(my|a|the|some|me|an)$/i.test(raw)) {
      // Capitalize words
      return raw.replace(/\b\w/g, l => l.toUpperCase());
    }
  }

  return 'your chosen destination';
}

function isUSATravel(text = '') {
  return /america|usa|united states|us\b|new york|california|los angeles|san francisco|las vegas|florida|texas|washington dc/i.test(text);
}

module.exports = {
  extractDestination,
  isUSATravel
};
