from io import BytesIO

from django.http import HttpResponse
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from bookings.services import BookingService


def _money(value):
    if value in (None, ""):
        return "0.00 MAD"
    return f"{value} MAD"


def _base_styles():
    styles = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=10,
        ),
        "heading": ParagraphStyle(
            "SectionHeading",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=colors.HexColor("#1d4ed8"),
            spaceAfter=4,
            spaceBefore=10,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#334155"),
        ),
    }


def _section_table(rows, col_widths=None):
    table = Table(rows, colWidths=col_widths, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eff6ff")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LEADING", (0, 0), (-1, -1), 12),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def _build_pdf(filename, title, story_builder):
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )
    story = []
    styles = _base_styles()
    story.append(Paragraph(title, styles["title"]))
    story.append(Paragraph(f"Generated on {timezone.localtime().strftime('%Y-%m-%d %H:%M')}", styles["body"]))
    story.append(Spacer(1, 6))
    story_builder(story, styles)
    document.build(story)
    response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def build_invoice_pdf_response(invoice):
    def builder(story, styles):
        agency = invoice.agency
        client = invoice.client
        car = invoice.car

        story.append(Paragraph("Agency", styles["heading"]))
        story.append(
            _section_table(
                [
                    ["Name", "Phone", "Email"],
                    [agency.name, agency.phone or "-", agency.email or "-"],
                    ["Address", "", ""],
                    [agency.address or "-", "", ""],
                ],
                col_widths=[55 * mm, 55 * mm, 55 * mm],
            )
        )

        story.append(Paragraph("Invoice details", styles["heading"]))
        story.append(
            _section_table(
                [
                    ["Invoice number", "Type", "Status", "Issue date"],
                    [invoice.invoice_number, invoice.type, invoice.status, str(invoice.issue_date)],
                    ["Due date", "Contract", "Client", "Car"],
                    [
                        str(invoice.due_date or "-"),
                        getattr(invoice.contract, "contract_number", "-"),
                        client.full_name if client else "-",
                        str(car) if car else "-",
                    ],
                ],
                col_widths=[42 * mm, 42 * mm, 42 * mm, 42 * mm],
            )
        )

        items = [["Description", "Qty", "Unit price", "Total"]]
        items.extend(
            [
                [item.description, str(item.quantity), _money(item.unit_price), _money(item.total_price)]
                for item in invoice.items.all()
            ]
            or [["No invoice items", "-", "-", "-"]]
        )
        story.append(Paragraph("Invoice items", styles["heading"]))
        story.append(_section_table(items, col_widths=[78 * mm, 22 * mm, 38 * mm, 38 * mm]))

        story.append(Paragraph("Totals", styles["heading"]))
        story.append(
            _section_table(
                [
                    ["Subtotal", "Discount", "Tax", "Total", "Paid", "Remaining"],
                    [
                        _money(invoice.subtotal),
                        _money(invoice.discount_amount),
                        _money(invoice.tax_amount),
                        _money(invoice.total_amount),
                        _money(invoice.paid_amount),
                        _money(invoice.remaining_amount),
                    ],
                ],
                col_widths=[28 * mm, 28 * mm, 24 * mm, 28 * mm, 28 * mm, 34 * mm],
            )
        )

        if invoice.notes:
            story.append(Paragraph("Notes", styles["heading"]))
            story.append(Paragraph(invoice.notes, styles["body"]))

    return _build_pdf(f"invoice-{invoice.invoice_number}.pdf", f"Invoice {invoice.invoice_number}", builder)


def build_contract_pdf_response(contract):
    def builder(story, styles):
        agency = contract.agency
        client = contract.client
        car = contract.car
        summary = BookingService.get_financial_summary(contract)

        story.append(Paragraph("Agency", styles["heading"]))
        story.append(
            _section_table(
                [
                    ["Name", "Phone", "Email"],
                    [agency.name, agency.phone or "-", agency.email or "-"],
                    ["Address", "", ""],
                    [agency.address or "-", "", ""],
                ],
                col_widths=[55 * mm, 55 * mm, 55 * mm],
            )
        )

        story.append(Paragraph("Client & vehicle", styles["heading"]))
        story.append(
            _section_table(
                [
                    ["Client", "Phone", "Car", "Plate"],
                    [client.full_name, client.phone or "-", f"{car.brand} {car.model}", car.plate_number],
                    ["Start", "Expected return", "Daily price", "Status"],
                    [str(contract.start_date), str(contract.expected_return_date), _money(contract.daily_price), contract.status],
                ],
                col_widths=[42 * mm, 34 * mm, 55 * mm, 41 * mm],
            )
        )

        story.append(Paragraph("Contract details", styles["heading"]))
        story.append(
            _section_table(
                [
                    ["Contract number", "Days", "Start mileage", "Start fuel"],
                    [
                        contract.contract_number,
                        str(contract.days_count),
                        str(contract.start_mileage),
                        f"{contract.start_fuel_level}%",
                    ],
                    ["Actual return", "Return mileage", "Return fuel", "Blacklist override"],
                    [
                        str(contract.actual_return_date or "-"),
                        str(contract.return_mileage or "-"),
                        f"{contract.return_fuel_level}%" if contract.return_fuel_level is not None else "-",
                        "Yes" if contract.blacklist_override else "No",
                    ],
                ],
                col_widths=[44 * mm, 24 * mm, 44 * mm, 56 * mm],
            )
        )

        story.append(Paragraph("Financial summary", styles["heading"]))
        story.append(
            _section_table(
                [
                    ["Subtotal", "Extra fees", "Discount", "Total", "Paid", "Remaining"],
                    [
                        _money(contract.subtotal),
                        _money(contract.extra_fees),
                        _money(contract.discount_amount),
                        _money(contract.total_amount),
                        _money(summary["total_paid"]),
                        _money(summary["total_due"]),
                    ],
                    ["Deposit held", "Total invoiced", "", "", "", ""],
                    [_money(summary["deposits_held"]), _money(summary["total_invoiced"]), "", "", "", ""],
                ],
                col_widths=[28 * mm, 28 * mm, 24 * mm, 28 * mm, 28 * mm, 34 * mm],
            )
        )

        if contract.blacklist_override_reason:
            story.append(Paragraph("Override reason", styles["heading"]))
            story.append(Paragraph(contract.blacklist_override_reason, styles["body"]))

    return _build_pdf(f"contract-{contract.contract_number}.pdf", f"Contract {contract.contract_number}", builder)
