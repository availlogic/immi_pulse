export const JURISDICTIONS: { code: string; name: string; region: string }[] = [
    { code: 'US', name: 'United States', region: 'North America' },
    { code: 'CA', name: 'Canada', region: 'North America' },
    { code: 'GB', name: 'United Kingdom', region: 'Europe/EEA' },
    { code: 'AU', name: 'Australia', region: 'Oceania' },
    { code: 'NZ', name: 'New Zealand', region: 'Oceania' },
    { code: 'SG', name: 'Singapore', region: 'Asia' },
    { code: 'DE', name: 'Germany', region: 'Europe/EEA' },
    { code: 'FR', name: 'France', region: 'Europe/EEA' },
    { code: 'ES', name: 'Spain', region: 'Europe/EEA' },
    { code: 'PT', name: 'Portugal', region: 'Europe/EEA' },
    { code: 'IE', name: 'Ireland', region: 'Europe/EEA' },
    { code: 'JP', name: 'Japan', region: 'Asia' },
    { code: 'KR', name: 'South Korea', region: 'Asia' },
    { code: 'MY', name: 'Malaysia', region: 'Asia' },
    { code: 'TH', name: 'Thailand', region: 'Asia' },
    { code: 'PH', name: 'Philippines', region: 'Asia' },
    { code: 'MX', name: 'Mexico', region: 'Latin America/Middle East' },
    { code: 'AE', name: 'UAE', region: 'Latin America/Middle East' },
    { code: 'TR', name: 'Turkey', region: 'Europe/EEA' },
    { code: 'PC', name: 'Pacific/Caribbean Islands', region: 'Asia' },
    { code: 'HK', name: 'Hong Kong', region: 'Asia' },
    { code: 'MO', name: 'Macau', region: 'Asia' },
    { code: 'TW', name: 'Taiwan', region: 'Asia' },
    { code: 'BR', name: 'Brazil', region: 'Latin America/Middle East' },
];

export const FEATURE_TAGS = [
    'Raising a Family',
    'Education',
    'Retirement',
    'Vacation',
    'Culture Inclusion',
    'Corporate Sponsorship',
] as const;

export const REGIONS = ['North America', 'Europe/EEA', 'Oceania', 'Asia', 'Latin America/Middle East'];

export function jurisdictionName(code: string): string {
    return JURISDICTIONS.find((j) => j.code === code)?.name ?? code;
}

export function jurisdictionByName(name: string): string | undefined {
    return JURISDICTIONS.find((j) => j.name === name)?.code;
}