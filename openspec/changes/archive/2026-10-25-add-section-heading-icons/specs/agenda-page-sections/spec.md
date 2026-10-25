# Spec Delta

## ADDED Requirements

### Requirement: Icons vor den Abschnitts-Überschriften
Jede einklappbare Abschnitts-Überschrift der Agenda-Seite MUSS links vom Überschriftentext ein Material-Design-Icon zeigen. Das Icon MUSS auch im eingeklappten Zustand sichtbar sein, MUSS rein dekorativ sein (für Screenreader ausgeblendet) und DARF den Text der Überschrift NICHT verändern. Zuordnung:
- „Details“: `mdi-card-text-outline`
- „Personen“: `mdi-account-group`
- „Agenda-Erfolge & Wanderpokale“: `mdi-trophy`
- „Agendapunkte“: `mdi-format-list-checks`

#### Scenario: Icons bei ausgeklappten Abschnitten
- **WHEN** die Agenda-Seite mit allen Abschnitten ausgeklappt angezeigt wird
- **THEN** steht vor jeder der vier Überschriften das zugeordnete Icon

#### Scenario: Icons bei eingeklappten Abschnitten
- **WHEN** alle Abschnitte eingeklappt sind
- **THEN** sind die vier Icons weiterhin vor den Überschriften sichtbar

#### Scenario: Überschriftentext unverändert
- **WHEN** ein Screenreader oder ein Test den Text der Überschrift „Personen“ liest
- **THEN** lautet er weiterhin genau „Personen“, ohne Icon-Text
