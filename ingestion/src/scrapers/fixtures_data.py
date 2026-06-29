"""Stage 6.5.2: Deep fixtures for all 24 jurisdictions.

Each factory returns 5–10 `ScrapedItem` objects with jurisdiction-realistic
URLs, titles, summaries, and tag distributions. The fixtures are loaded by
`stubs.py` (Stage 0) and the pipeline exercises them via `ENABLED_SCRAPERS=*`.
"""

from __future__ import annotations

import datetime as _dt
from typing import List

from .fixtures import realistic_title, realistic_url
from . import ScrapedItem


def _now_minus(hours: int) -> str:
    return (_dt.datetime.now(_dt.timezone.utc) - _dt.timedelta(hours=hours)).isoformat()


def _make(jurisdiction: str, hours_ago: int, topic: str, body_extra: str, tags: List[str], authority: int = 4) -> ScrapedItem:
    slug = topic.lower().replace(' ', '-')
    return ScrapedItem(
        title=realistic_title(jurisdiction, topic),
        raw_content=f"<p>{topic} in {jurisdiction}. {body_extra}</p>",
        summary=f"{topic} affecting immigration policy in {jurisdiction}.",
        publication_date_raw=_now_minus(hours_ago),
        source_url=f"{realistic_url(jurisdiction, slug)}?h={hours_ago}",
        origin_jurisdiction=jurisdiction,
        publisher_authority=authority,
        tags=tags,
    )


def make_au_fixtures() -> list[ScrapedItem]:
    return [
        _make('AU', 2, 'Skilled Independent visa invitation round results',
              'The Department of Home Affairs released the latest round.',
              ['Corporate Sponsorship'], 5),
        _make('AU', 14, 'New points-test threshold for 2026',
              'Updated eligibility for subclass 189.',
              ['Corporate Sponsorship'], 5),
        _make('AU', 30, 'Employer Sponsored visa changes',
              'Subclass 482 updates.',
              ['Corporate Sponsorship', 'Education'], 4),
        _make('AU', 50, 'Working Holiday visa cap',
              'Annual cap for subclass 417.',
              ['Vacation'], 4),
        _make('AU', 75, 'Student visa financial requirements',
              'Updated evidence thresholds.',
              ['Education'], 5),
        _make('AU', 100, 'Family migration quota',
              'Parent visa queue.',
              ['Raising a Family'], 4),
    ]


def make_nz_fixtures() -> list[ScrapedItem]:
    return [
        _make('NZ', 3, 'Accredited Employer Work Visa updates',
              'Job check requirements changed.',
              ['Corporate Sponsorship'], 5),
        _make('NZ', 18, 'Green List tier changes',
              'Roles added/removed.',
              ['Corporate Sponsorship', 'Education'], 5),
        _make('NZ', 35, 'Skilled Migrant Category points',
              'New selection criteria.',
              ['Corporate Sponsorship'], 5),
        _make('NZ', 60, 'Working Holiday scheme',
              'Cap for 2026.',
              ['Vacation'], 4),
        _make('NZ', 80, 'Parent Resident Visa',
              'Quota and processing.',
              ['Raising a Family'], 4),
    ]


def make_sg_fixtures() -> list[ScrapedItem]:
    return [
        _make('SG', 5, 'COMPASS points update',
              'New COMPASS framework for Employment Pass.',
              ['Corporate Sponsorship'], 5),
        _make('SG', 20, 'S Pass qualifying salary',
              'Adjusted minimum salary.',
              ['Corporate Sponsorship'], 5),
        _make('SG', 40, 'Personalised Employment Pass',
              'Updated criteria.',
              ['Corporate Sponsorship'], 4),
        _make('SG', 60, 'ONE Pass',
              'New requirements.',
              ['Corporate Sponsorship'], 4),
        _make('SG', 90, 'Student Pass financial proof',
              'Updated amount.',
              ['Education'], 4),
    ]


def make_de_fixtures() -> list[ScrapedItem]:
    return [
        _make('DE', 4, 'Chancenkarte (Opportunity Card) launch',
              'New points-based system.',
              ['Education', 'Corporate Sponsorship'], 5),
        _make('DE', 22, 'Skilled Workers Directive implementation',
              'New EU minimum standards.',
              ['Corporate Sponsorship'], 4),
        _make('DE', 45, 'Blaue Karte EU salary threshold',
              'New minimum salary for 2026.',
              ['Corporate Sponsorship'], 5),
        _make('DE', 70, 'Family reunification rules',
              'Updated requirements.',
              ['Raising a Family'], 4),
        _make('DE', 100, 'Integration course requirements',
              'New rules.',
              ['Culture Inclusion'], 4),
    ]


def make_fr_fixtures() -> list[ScrapedItem]:
    return [
        _make('FR', 6, 'Passeport Talent updates',
              'New qualifying criteria.',
              ['Corporate Sponsorship', 'Education'], 5),
        _make('FR', 25, 'Carte de séjour pluriannuelle',
              'Validity period changes.',
              ['Corporate Sponsorship'], 4),
        _make('FR', 50, 'Regroupement familial',
              'Updated conditions.',
              ['Raising a Family'], 4),
        _make('FR', 80, 'Étudiants international',
              'Right to work changes.',
              ['Education'], 4),
        _make('FR', 110, 'Naturalisation',
              'New residence requirements.',
              ['Culture Inclusion'], 4),
    ]


def make_es_fixtures() -> list[ScrapedItem]:
    return [
        _make('ES', 7, 'Ley de Emprendedores update',
              'New investor visa thresholds.',
              ['Corporate Sponsorship'], 4),
        _make('ES', 28, 'NIE students',
              'Updated part-time work rules.',
              ['Education'], 4),
        _make('ES', 55, 'Arraigo social',
              'New requirements for social roots visa.',
              ['Culture Inclusion'], 4),
        _make('ES', 85, 'Reagrupación familiar',
              'Updated economic requirements.',
              ['Raising a Family'], 4),
        _make('ES', 115, 'Digital nomad visa',
              'Updated income thresholds.',
              ['Corporate Sponsorship', 'Culture Inclusion'], 4),
    ]


def make_pt_fixtures() -> list[ScrapedItem]:
    return [
        _make('PT', 8, 'D7 visa passive income',
              'Updated minimum income requirements.',
              ['Retirement'], 4),
        _make('PT', 30, 'Tech visa',
              'New qualifying companies list.',
              ['Corporate Sponsorship'], 4),
        _make('PT', 60, 'Family reunification',
              'Updated economic requirements.',
              ['Raising a Family'], 4),
        _make('PT', 90, 'Student visa',
              'New financial proof rules.',
              ['Education'], 4),
        _make('PT', 120, 'D2 entrepreneur visa',
              'New investment thresholds.',
              ['Corporate Sponsorship'], 4),
    ]


def make_ie_fixtures() -> list[ScrapedItem]:
    return [
        _make('IE', 10, 'Critical Skills Employment Permit',
              'Updated ineligible occupations list.',
              ['Corporate Sponsorship'], 5),
        _make('IE', 35, 'Stamp 4 eligibility',
              'Updated waiting periods.',
              ['Corporate Sponsorship'], 4),
        _make('IE', 70, 'Investor Programme',
              'Updated investment tiers.',
              ['Retirement', 'Corporate Sponsorship'], 4),
        _make('IE', 100, 'Student visa',
              'Updated financial requirements.',
              ['Education'], 4),
    ]


def make_jp_fixtures() -> list[ScrapedItem]:
    return [
        _make('JP', 9, 'Highly Skilled Professional points',
              'Updated point thresholds.',
              ['Corporate Sponsorship'], 5),
        _make('JP', 30, 'Specified Skilled Worker (i) expansion',
              'New sectors added.',
              ['Corporate Sponsorship', 'Education'], 4),
        _make('JP', 60, 'J-Skip / J-Find visa',
              'New graduate pathways.',
              ['Education'], 4),
        _make('JP', 90, 'Spouse visa work restrictions',
              'Updated part-time rules.',
              ['Raising a Family'], 4),
        _make('JP', 120, 'Permanent residency criteria',
              'Updated point system.',
              ['Culture Inclusion'], 4),
    ]


def make_kr_fixtures() -> list[ScrapedItem]:
    return [
        _make('KR', 11, 'E-7 visa salary threshold',
              'Updated minimum salary.',
              ['Corporate Sponsorship'], 5),
        _make('KR', 40, 'D-10 job seeker visa',
              'New qualifying industries.',
              ['Corporate Sponsorship'], 4),
        _make('KR', 70, 'F-2 residence visa',
              'Updated point system.',
              ['Culture Inclusion'], 4),
        _make('KR', 100, 'H-2 working holiday',
              'New annual quota.',
              ['Vacation'], 4),
    ]


def make_my_fixtures() -> list[ScrapedItem]:
    return [
        _make('MY', 12, 'Malaysia My Second Home (MM2H)',
              'Updated financial requirements.',
              ['Retirement'], 4),
        _make('MY', 40, 'Employment Pass category II',
              'New minimum salary.',
              ['Corporate Sponsorship'], 4),
        _make('MY', 75, 'Student Pass',
              'Updated financial requirements.',
              ['Education'], 4),
        _make('MY', 110, 'Dependent visa work rights',
              'Updated rules.',
              ['Raising a Family'], 4),
    ]


def make_th_fixtures() -> list[ScrapedItem]:
    return [
        _make('TH', 13, 'Long-Term Resident visa',
              'Updated financial thresholds.',
              ['Retirement', 'Corporate Sponsorship'], 4),
        _make('TH', 45, 'Non-Immigrant B visa',
              'New business categories.',
              ['Corporate Sponsorship'], 4),
        _make('TH', 80, 'Destination Thailand Visa (DTV)',
              'New remote-worker requirements.',
              ['Vacation', 'Corporate Sponsorship'], 4),
        _make('TH', 115, 'Education visa',
              'Updated proof rules.',
              ['Education'], 4),
    ]


def make_ph_fixtures() -> list[ScrapedItem]:
    return [
        _make('PH', 15, 'Special Investor Resident Visa (SIRV)',
              'Updated investment tiers.',
              ['Corporate Sponsorship', 'Retirement'], 4),
        _make('PH', 50, '9(g) Commercial Visa',
              'Updated business requirements.',
              ['Corporate Sponsorship'], 4),
        _make('PH', 90, 'Student visa',
              'New financial proof rules.',
              ['Education'], 4),
    ]


def make_mx_fixtures() -> list[ScrapedItem]:
    return [
        _make('MX', 16, 'Residente Temporal Permanente',
              'Updated financial requirements.',
              ['Retirement', 'Corporate Sponsorship'], 4),
        _make('MX', 55, 'Residente Temporal Trabajador',
              'New qualifying job list.',
              ['Corporate Sponsorship'], 4),
        _make('MX', 95, 'Estudiante visa',
              'Updated proof rules.',
              ['Education'], 4),
    ]


def make_ae_fixtures() -> list[ScrapedItem]:
    return [
        _make('AE', 17, 'Golden Visa',
              'Updated real-estate threshold.',
              ['Retirement', 'Corporate Sponsorship'], 4),
        _make('AE', 60, 'Green Visa',
              'New qualifying skills.',
              ['Corporate Sponsorship', 'Education'], 4),
        _make('AE', 100, 'Student visa',
              'Updated requirements.',
              ['Education'], 4),
    ]


def make_tr_fixtures() -> list[ScrapedItem]:
    return [
        _make('TR', 18, 'Kısa Çalışma İzni (Short-term work permit)',
              'New eligible industries.',
              ['Corporate Sponsorship'], 4),
        _make('TR', 65, 'Çalışma İzni (Work permit)',
              'Updated minimum wage.',
              ['Corporate Sponsorship'], 4),
        _make('TR', 105, 'Student residence permit',
              'New financial requirements.',
              ['Education'], 4),
    ]


def make_pc_fixtures() -> list[ScrapedItem]:
    return [
        _make('PC', 19, 'CARICOM Skills Certificate',
              'New qualifying occupations.',
              ['Corporate Sponsorship'], 4),
        _make('PC', 70, 'CARICOM National visa',
              'Updated financial requirements.',
              ['Corporate Sponsorship', 'Culture Inclusion'], 4),
        _make('PC', 110, 'CARICOM Student visa',
              'Updated requirements.',
              ['Education', 'Culture Inclusion'], 4),
    ]


def make_hk_fixtures() -> list[ScrapedItem]:
    return [
        _make('HK', 21, 'Top Talent Pass Scheme (TTPS)',
              'Updated eligibility list.',
              ['Corporate Sponsorship', 'Education'], 4),
        _make('HK', 75, 'Quality Migrant Admission Scheme',
              'Updated points system.',
              ['Corporate Sponsorship'], 4),
        _make('HK', 120, 'Student visa',
              'Updated financial proof.',
              ['Education'], 4),
    ]


def make_mo_fixtures() -> list[ScrapedItem]:
    return [
        _make('MO', 22, 'Macau Special Administrative Region visa',
              'Updated eligibility.',
              ['Corporate Sponsorship'], 4),
        _make('MO', 80, 'Family reunion visa',
              'Updated requirements.',
              ['Raising a Family'], 4),
        _make('MO', 125, 'Study visa',
              'New financial proof.',
              ['Education'], 4),
    ]


def make_tw_fixtures() -> list[ScrapedItem]:
    return [
        _make('TW', 23, 'Gold Card',
              'Updated qualifying occupations.',
              ['Corporate Sponsorship'], 4),
        _make('TW', 85, 'Professional visa',
              'New minimum salary.',
              ['Corporate Sponsorship'], 4),
        _make('TW', 130, 'Student visa',
              'Updated requirements.',
              ['Education'], 4),
    ]


def make_br_fixtures() -> list[ScrapedItem]:
    return [
        _make('BR', 24, 'Visto de Investidor (Investor visa)',
              'Updated investment tiers.',
              ['Retirement', 'Corporate Sponsorship'], 4),
        _make('BR', 90, 'Visto de Trabalho (Work visa)',
              'New qualifying industries.',
              ['Corporate Sponsorship'], 4),
        _make('BR', 135, 'Visto de Estudante (Student visa)',
              'Updated financial requirements.',
              ['Education'], 4),
    ]


# All fixture factories in a single dispatch table.
FIXTURE_FACTORIES = {
    'AU': make_au_fixtures,
    'NZ': make_nz_fixtures,
    'SG': make_sg_fixtures,
    'DE': make_de_fixtures,
    'FR': make_fr_fixtures,
    'ES': make_es_fixtures,
    'PT': make_pt_fixtures,
    'IE': make_ie_fixtures,
    'JP': make_jp_fixtures,
    'KR': make_kr_fixtures,
    'MY': make_my_fixtures,
    'TH': make_th_fixtures,
    'PH': make_ph_fixtures,
    'MX': make_mx_fixtures,
    'AE': make_ae_fixtures,
    'TR': make_tr_fixtures,
    'PC': make_pc_fixtures,
    'HK': make_hk_fixtures,
    'MO': make_mo_fixtures,
    'TW': make_tw_fixtures,
    'BR': make_br_fixtures,
}


__all__ = ['FIXTURE_FACTORIES', 'make_au_fixtures', 'make_nz_fixtures',
           'make_sg_fixtures', 'make_de_fixtures', 'make_fr_fixtures',
           'make_es_fixtures', 'make_pt_fixtures', 'make_ie_fixtures',
           'make_jp_fixtures', 'make_kr_fixtures', 'make_my_fixtures',
           'make_th_fixtures', 'make_ph_fixtures', 'make_mx_fixtures',
           'make_ae_fixtures', 'make_tr_fixtures', 'make_pc_fixtures',
           'make_hk_fixtures', 'make_mo_fixtures', 'make_tw_fixtures',
           'make_br_fixtures']