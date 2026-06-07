"""Generate a realistic-looking sample California traffic collision report PDF
for the Unsiloed parsing demo.

Usage:
    uv --directory agent-py run python scripts/generate_sample_police_report.py

Writes to: agent-py/data/sample-police-report.pdf
"""

from pathlib import Path

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

OUTPUT = Path(__file__).resolve().parent.parent / "data" / "sample-police-report.pdf"


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=LETTER,
        leftMargin=0.7 * inch,
        rightMargin=0.7 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
        title="Traffic Collision Report",
    )

    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "title",
        parent=styles["Title"],
        fontSize=18,
        textColor=colors.HexColor("#1a1a1a"),
        spaceAfter=4,
    )
    h2 = ParagraphStyle(
        "h2",
        parent=styles["Heading2"],
        fontSize=11,
        textColor=colors.HexColor("#1c5fb3"),
        spaceBefore=10,
        spaceAfter=4,
    )
    body = ParagraphStyle(
        "body",
        parent=styles["BodyText"],
        fontSize=10,
        leading=14,
    )
    meta = ParagraphStyle(
        "meta",
        parent=styles["BodyText"],
        fontSize=9,
        textColor=colors.HexColor("#7a7a7a"),
    )

    story = []
    story.append(Paragraph("CALIFORNIA HIGHWAY PATROL", title))
    story.append(Paragraph("Traffic Collision Report", title))
    story.append(Paragraph("Form CHP-555 · Sample Document", meta))
    story.append(Spacer(1, 12))

    # Identifier block — plain "Key: Value" lines so Unsiloed serializes them
    # as labelled markdown lines (not table rows that scramble field order).
    story.append(Paragraph("Report #: BB-2026-04472", body))
    story.append(Paragraph("Incident Date: 06/03/2026", body))
    story.append(Paragraph("Time of Call: 21:18 PDT", body))
    story.append(Paragraph("Badge #: 21847", body))

    story.append(Paragraph("OFFICER", h2))
    story.append(Paragraph("Officer: Sgt. Rivera, M.", body))
    story.append(
        Paragraph(
            "Reporting Agency: California Highway Patrol — Bay Bridge Division",
            body,
        )
    )

    story.append(Paragraph("LOCATION", h2))
    story.append(
        Paragraph(
            "Location: Eastbound I-80 Bay Bridge approach San Francisco CA",
            body,
        )
    )

    story.append(Paragraph("INVOLVED PARTIES", h2))
    party_rows = [
        ["Party", "Driver", "Vehicle", "Insurance Carrier"],
        ["Party 1 (reporting)", "Maria Garcia", "2021 Toyota Camry, lic. 8MCA942", "Allstate · Policy AS-44128-CA"],
        ["Party 2 (at fault)", "Daniel Whitaker", "2023 Ford F-150, lic. 7XTV193", "Geico · Policy GE-22871-CA"],
    ]
    party_tbl = Table(party_rows, colWidths=[1.4 * inch, 1.6 * inch, 2.0 * inch, 2.0 * inch])
    party_tbl.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f5f1e8")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1a1a1a")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e6e1d4")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(party_tbl)

    story.append(Paragraph("CITATIONS & DETERMINATION", h2))
    story.append(Paragraph("At-Fault Driver: Daniel Whitaker", body))
    story.append(Paragraph("Citation Code: CVC 22350 — Unsafe Speed for Conditions", body))
    story.append(
        Paragraph(
            "Determination: Party 2 failed to maintain safe following distance in stop-and-go "
            "traffic, resulting in rear-end impact with Party 1.",
            body,
        )
    )

    story.append(Paragraph("NARRATIVE", h2))
    story.append(
        Paragraph(
            "Narrative: On 06/03/2026 at approximately 21:18 hours, dispatch received a 911 call reporting "
            "a two-vehicle collision in the eastbound lanes of I-80 approaching the Bay Bridge. Upon arrival "
            "at 21:31, Sgt. Rivera observed Party 1's 2021 Toyota Camry stopped in the #3 lane with moderate "
            "rear-end damage. Party 2's 2023 Ford F-150 was stopped approximately 40 feet behind with "
            "moderate front-end damage and a deployed driver-side airbag.<br/><br/>"
            "Party 1 (Garcia) reported that traffic ahead had slowed for construction signage. She had come "
            "to a complete stop when she was struck from behind. Party 1 reported neck and shoulder pain at "
            "the scene and declined ambulance transport but stated she would seek medical evaluation. "
            "Party 2 (Whitaker) admitted to looking down at his phone immediately prior to impact and stated "
            "he 'didn't see the traffic stopping.' Whitaker was issued a citation under CVC 22350.<br/><br/>"
            "Both vehicles were drivable but towed at the request of the involved parties. Photographs of "
            "the scene, vehicle damage, and final rest positions were captured by Officer Tanaka, Badge "
            "31092. No third-party witnesses came forward at the scene.",
            body,
        )
    )

    story.append(Paragraph("INJURIES", h2))
    story.append(
        Paragraph(
            "Party 1 (Garcia): Reported neck pain, upper back stiffness. Refused on-scene transport. "
            "Advised to seek same-day urgent care evaluation.<br/>"
            "Party 2 (Whitaker): No reported injury. Airbag deployment noted.",
            body,
        )
    )

    story.append(Spacer(1, 16))
    story.append(
        Paragraph(
            "I certify under penalty of perjury under the laws of the State of California that the foregoing "
            "is true and correct. Sgt. M. Rivera, Badge 21847 · CHP Bay Bridge Division · 06/03/2026",
            meta,
        )
    )

    doc.build(story)
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    build()
