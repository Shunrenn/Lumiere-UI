import jsPDF from 'jspdf'
import type { EventDispatchSummary } from '@/lib/warehouse-dispatch'
import type { DeficitLine } from '@/lib/warehouse-replenishment'
import type { ProcurementItem } from '@/lib/types'

// ─── Authoritative Brand Theme Tokens (from src/index.css) ───
const BRAND = {
  PRIMARY: [155, 107, 63] as [number, number, number],        // #9B6B3F (Lumière Gold / Bronze)
  FOREGROUND: [39, 37, 34] as [number, number, number],      // #272522 (Warm Charcoal)
  MUTED: [117, 111, 103] as [number, number, number],         // #756F67 (Warm Gray)
  CARD_BG: [251, 248, 242] as [number, number, number],       // #FBF8F2 (Warm Cream Header Fill)
  BORDER: [216, 206, 192] as [number, number, number],        // #D8CEC0 (Warm Border)
  ZEBRA_BG: [253, 251, 247] as [number, number, number],      // #FDFBF7 (Subtle Warm Cream)
  WHITE: [255, 255, 255] as [number, number, number],
  SUCCESS: [5, 150, 105] as [number, number, number],        // #059669 (Emerald Green)
  WARNING: [180, 83, 9] as [number, number, number],          // #B45309 (Amber Gold)
  DANGER: [168, 77, 59] as [number, number, number],          // #A84D3B (Terracotta Red)
}

interface ColumnDef {
  header: string
  width: number
  align?: 'left' | 'center' | 'right'
}

class PdfReportBuilder {
  doc: jsPDF
  margin = 40
  pageWidth = 612 // Letter width in pt
  pageHeight = 792 // Letter height in pt
  printableWidth = 532
  y = 40
  currentPage = 1

  constructor() {
    this.doc = new jsPDF({ unit: 'pt', format: 'letter' })
  }

  // Draw standardized brand header banner
  drawHeader(title: string, subheaderLines: string[]) {
    const { doc, margin, pageWidth } = this
    this.y = margin

    // Top Brand Gold Accent Bar
    doc.setFillColor(...BRAND.PRIMARY)
    doc.rect(margin, this.y, 4, 34, 'F')

    // Document Title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...BRAND.FOREGROUND)
    doc.text(`LUMIÈRE OPERATIONS — ${title.toUpperCase()}`, margin + 12, this.y + 14)

    // Generation timestamp
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND.MUTED)
    const timeStr = `Generated: ${new Date().toLocaleString()}`
    doc.text(timeStr, pageWidth - margin, this.y + 12, { align: 'right' })

    this.y += 24

    // Metadata Subheader Box if provided
    if (subheaderLines.length > 0) {
      this.y += 6
      const boxHeight = 14 + subheaderLines.length * 13
      doc.setFillColor(...BRAND.CARD_BG)
      doc.setDrawColor(...BRAND.BORDER)
      doc.setLineWidth(0.75)
      doc.roundedRect(margin, this.y, this.printableWidth, boxHeight, 4, 4, 'FD')

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...BRAND.FOREGROUND)
      let lineY = this.y + 14
      subheaderLines.forEach((line) => {
        doc.text(line, margin + 10, lineY)
        lineY += 13
      })
      this.y += boxHeight + 10
    } else {
      this.y += 10
    }

    // Divider Line
    doc.setLineWidth(0.5)
    doc.setDrawColor(...BRAND.BORDER)
    doc.line(margin, this.y, pageWidth - margin, this.y)
    this.y += 15
  }

  // Draw structured table header
  drawTableHeader(columns: ColumnDef[]) {
    const { doc, margin } = this

    doc.setFillColor(...BRAND.CARD_BG)
    doc.rect(margin, this.y, this.printableWidth, 20, 'F')

    doc.setDrawColor(...BRAND.BORDER)
    doc.setLineWidth(0.75)
    doc.line(margin, this.y + 20, margin + this.printableWidth, this.y + 20)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...BRAND.PRIMARY)

    let currentX = margin
    columns.forEach((col) => {
      const textX = col.align === 'center' ? currentX + col.width / 2 : col.align === 'right' ? currentX + col.width - 6 : currentX + 6
      doc.text(col.header.toUpperCase(), textX, this.y + 13, { align: col.align || 'left' })
      currentX += col.width
    })

    this.y += 24
  }

  // Check page bottom overflow and add new page if needed
  checkPageBreak(requiredHeight = 22, columns?: ColumnDef[]) {
    if (this.y + requiredHeight > this.pageHeight - 50) {
      this.doc.addPage()
      this.currentPage += 1
      this.y = this.margin
      if (columns) {
        this.drawTableHeader(columns)
      }
    }
  }

  // Add standard footer with page numbers
  addFooters() {
    const totalPages = (this.doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(7.5)
      this.doc.setTextColor(...BRAND.MUTED)
      this.doc.setLineWidth(0.5)
      this.doc.setDrawColor(...BRAND.BORDER)
      this.doc.line(this.margin, this.pageHeight - 35, this.pageWidth - this.margin, this.pageHeight - 35)

      this.doc.text('Lumière Management System · Confidential Operations Report', this.margin, this.pageHeight - 22)
      this.doc.text(`Page ${i} of ${totalPages}`, this.pageWidth - this.margin, this.pageHeight - 22, { align: 'right' })
    }
  }

  save(filename: string) {
    this.addFooters()
    this.doc.save(filename)
  }
}

// Helper to color-code status strings
function getStatusRGB(statusStr?: string): [number, number, number] {
  if (!statusStr) return BRAND.FOREGROUND
  const lower = statusStr.toLowerCase()
  if (lower.includes('delivered') || lower.includes('confirmed') || lower.includes('active') || lower.includes('present') || lower.includes('available') || lower.includes('success')) {
    return BRAND.SUCCESS
  }
  if (lower.includes('pending') || lower.includes('flagged') || lower.includes('draft') || lower.includes('reorder') || lower.includes('warning')) {
    return BRAND.WARNING
  }
  if (lower.includes('critical') || lower.includes('deficit') || lower.includes('no_show') || lower.includes('denied') || lower.includes('unavailable') || lower.includes('out_of_stock')) {
    return BRAND.DANGER
  }
  return BRAND.FOREGROUND
}

// ─── 1. Security & System Audit Logs PDF Exporter ───
export function exportSecurityAuditPdf(
  title: string,
  logs: Array<{
    timestamp: string
    date?: string
    logId: string
    account?: string
    employeeId?: string
    role: string
    action: string
    status?: string
    ip?: string
    terminal?: string
  }>,
  filename: string,
) {
  const builder = new PdfReportBuilder()
  builder.drawHeader(title, [
    `Total Logs Rendered: ${logs.length} entries`,
    `Scope: Filtered System Security & Audit Log Record`,
  ])

  const cols: ColumnDef[] = [
    { header: 'Timestamp', width: 90 },
    { header: 'Log ID / User', width: 100 },
    { header: 'Role', width: 80 },
    { header: 'Action Event', width: 172 },
    { header: 'Status', width: 50, align: 'center' },
    { header: 'IP Address', width: 40, align: 'right' },
  ]

  builder.drawTableHeader(cols)

  logs.forEach((log, idx) => {
    builder.checkPageBreak(18, cols)
    const { doc, margin } = builder

    if (idx % 2 === 1) {
      doc.setFillColor(...BRAND.ZEBRA_BG)
      doc.rect(margin, builder.y - 10, builder.printableWidth, 16, 'F')
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)

    const ts = log.timestamp || log.date || 'N/A'
    const userStr = log.employeeId || log.account || log.logId
    const roleStr = log.role || 'System'
    const statusText = log.status || 'INFO'

    doc.setTextColor(...BRAND.FOREGROUND)
    doc.text(ts.slice(0, 18), margin + 6, builder.y)
    doc.text(userStr.slice(0, 18), margin + 96, builder.y)
    doc.text(roleStr.slice(0, 15), margin + 196, builder.y)
    doc.text(log.action.slice(0, 32), margin + 276, builder.y)

    // Status Badge
    const statusColor = getStatusRGB(statusText)
    doc.setTextColor(...statusColor)
    doc.setFont('helvetica', 'bold')
    doc.text(statusText.toUpperCase().slice(0, 8), margin + 448 + 25, builder.y, { align: 'center' })

    // IP
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BRAND.MUTED)
    doc.text((log.ip || '-').slice(0, 12), margin + 498 + 34, builder.y, { align: 'right' })

    builder.y += 16
  })

  builder.save(filename)
}

// ─── 2. Warehouse Operations Activity Logs PDF Exporter ───
export function exportWarehouseLogsPdf(
  logs: Array<{
    timestamp: string
    logId: string
    assetId: string
    assetName: string
    transaction: string
    qty: number | string
    handledBy: string
    notes: string
  }>,
  filename: string,
) {
  const builder = new PdfReportBuilder()
  builder.drawHeader('WAREHOUSE ACTIVITY & INVENTORY LOGS', [
    `Total Log Entries: ${logs.length} movement records`,
    'Scope: Warehouse Logistics Movement & Handover Log',
  ])

  const cols: ColumnDef[] = [
    { header: 'Timestamp', width: 90 },
    { header: 'Log ID', width: 65 },
    { header: 'Asset / Item Name', width: 157 },
    { header: 'Transaction', width: 85 },
    { header: 'Qty', width: 35, align: 'center' },
    { header: 'Handled By', width: 100, align: 'right' },
  ]

  builder.drawTableHeader(cols)

  logs.forEach((l, idx) => {
    builder.checkPageBreak(18, cols)
    const { doc, margin } = builder

    if (idx % 2 === 1) {
      doc.setFillColor(...BRAND.ZEBRA_BG)
      doc.rect(margin, builder.y - 10, builder.printableWidth, 16, 'F')
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND.FOREGROUND)

    doc.text(l.timestamp.slice(0, 18), margin + 6, builder.y)
    doc.text(l.logId, margin + 96, builder.y)
    doc.text(l.assetName.slice(0, 26), margin + 161, builder.y)

    const txColor = getStatusRGB(l.transaction)
    doc.setTextColor(...txColor)
    doc.setFont('helvetica', 'bold')
    doc.text(l.transaction.slice(0, 14), margin + 318, builder.y)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BRAND.FOREGROUND)
    doc.text(String(l.qty), margin + 403 + 17, builder.y, { align: 'center' })

    doc.setTextColor(...BRAND.MUTED)
    doc.text(l.handledBy.slice(0, 18), margin + 438 + 94, builder.y, { align: 'right' })

    builder.y += 16
  })

  builder.save(filename)
}

// ─── 3. Dispatch Manifest Event PDF Exporter ───
export function exportDispatchEventPdf(summary: EventDispatchSummary) {
  const builder = new PdfReportBuilder()
  builder.drawHeader('DISPATCH MANIFEST (EVENT SCOPE)', [
    `Event: ${summary.eventTitle.toUpperCase()}`,
    `Venue: ${summary.venue}   |   Target Date: ${summary.targetDate}`,
    `Total Batches: ${summary.batches.length}   |   Handshake Rate: ${summary.handshakePercent}%`,
  ])

  const cols: ColumnDef[] = [
    { header: 'Batch ID', width: 65 },
    { header: 'Vehicle / Plate', width: 110 },
    { header: 'Dir / Stage', width: 90 },
    { header: 'Item Name', width: 147 },
    { header: 'Plan/Act', width: 50, align: 'center' },
    { header: 'Status', width: 70, align: 'right' },
  ]

  builder.drawTableHeader(cols)

  let rowIdx = 0
  summary.batches.forEach((batch) => {
    batch.reconciliation.forEach((item) => {
      builder.checkPageBreak(18, cols)
      const { doc, margin } = builder

      if (rowIdx % 2 === 1) {
        doc.setFillColor(...BRAND.ZEBRA_BG)
        doc.rect(margin, builder.y - 10, builder.printableWidth, 16, 'F')
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...BRAND.FOREGROUND)

      doc.text(batch.id.slice(-8), margin + 6, builder.y)
      doc.text(`${batch.vehicleType} (${batch.plateNumber})`.slice(0, 20), margin + 71, builder.y)
      doc.text(`${batch.direction.toUpperCase()} · ${batch.stage}`.slice(0, 16), margin + 181, builder.y)
      doc.text(item.itemName.slice(0, 24), margin + 271, builder.y)

      doc.text(`${item.planned}/${item.actual}`, margin + 418 + 25, builder.y, { align: 'center' })

      const statusColor = getStatusRGB(item.status)
      doc.setTextColor(...statusColor)
      doc.setFont('helvetica', 'bold')
      doc.text(item.status, margin + 468 + 64, builder.y, { align: 'right' })

      rowIdx++
      builder.y += 16
    })
  })

  const slug = summary.eventTitle.toLowerCase().replace(/\s+/g, '-')
  builder.save(`dispatch-manifest-${slug}.pdf`)
}

// ─── 4. Dispatch Consolidated Manifest PDF Exporter ───
export function exportDispatchConsolidatedPdf(summaries: EventDispatchSummary[]) {
  const builder = new PdfReportBuilder()
  const totalBatches = summaries.reduce((acc, s) => acc + s.batches.length, 0)
  builder.drawHeader('CONSOLIDATED DISPATCH MANIFEST', [
    `Total Events: ${summaries.length}   |   Total Batches: ${totalBatches}`,
    'Scope: Global Consolidated Warehouse Dispatch & Logistics Manifest',
  ])

  const cols: ColumnDef[] = [
    { header: 'Event Title', width: 110 },
    { header: 'Vehicle / Plate', width: 100 },
    { header: 'Dir / Stage', width: 85 },
    { header: 'Item Name', width: 132 },
    { header: 'Plan/Act', width: 45, align: 'center' },
    { header: 'Status', width: 60, align: 'right' },
  ]

  builder.drawTableHeader(cols)

  let rowIdx = 0
  summaries.forEach((summary) => {
    summary.batches.forEach((batch) => {
      batch.reconciliation.forEach((item) => {
        builder.checkPageBreak(18, cols)
        const { doc, margin } = builder

        if (rowIdx % 2 === 1) {
          doc.setFillColor(...BRAND.ZEBRA_BG)
          doc.rect(margin, builder.y - 10, builder.printableWidth, 16, 'F')
        }

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...BRAND.FOREGROUND)

        doc.text(summary.eventTitle.slice(0, 18), margin + 6, builder.y)
        doc.text(`${batch.vehicleType} (${batch.plateNumber})`.slice(0, 18), margin + 116, builder.y)
        doc.text(`${batch.direction.toUpperCase()} · ${batch.stage}`.slice(0, 15), margin + 216, builder.y)
        doc.text(item.itemName.slice(0, 22), margin + 301, builder.y)

        doc.text(`${item.planned}/${item.actual}`, margin + 433 + 22, builder.y, { align: 'center' })

        const statusColor = getStatusRGB(item.status)
        doc.setTextColor(...statusColor)
        doc.setFont('helvetica', 'bold')
        doc.text(item.status, margin + 478 + 54, builder.y, { align: 'right' })

        rowIdx++
        builder.y += 16
      })
    })
  })

  builder.save('dispatch-manifest-consolidated.pdf')
}

// ─── 5. Replenishment Deficit Report PDF Exporter ───
export function exportReplenishmentDeficitPdf(lines: DeficitLine[], reportTitle?: string) {
  const builder = new PdfReportBuilder()
  const activeLines = lines.filter((l) => l.status !== 'Received')
  const totalEstimatedCost = activeLines.reduce((sum, l) => {
    const required = l.quantityNeeded ?? Math.max(0, l.threshold - l.currentStock)
    const unitPrice = l.costPerUnit ?? (l.category === 'Drapery & Fabrics' ? 350 : 180)
    return sum + required * unitPrice
  }, 0)

  builder.drawHeader(reportTitle ? reportTitle.toUpperCase() : 'REPLENISHMENT & DEFICIT REPORT', [
    `Deficit Lines Flagged: ${lines.length} items`,
    `Total Estimated Procurement Cost: PHP ${totalEstimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    'Scope: Active Deficit & Automated Procurement Candidates',
  ])

  const cols: ColumnDef[] = [
    { header: 'Item Name', width: 125 },
    { header: 'Event / Source', width: 110 },
    { header: 'Stock/Thresh', width: 75, align: 'center' },
    { header: 'Est. Cost', width: 70, align: 'right' },
    { header: 'Priority', width: 65, align: 'center' },
    { header: 'Status', width: 87, align: 'right' },
  ]

  builder.drawTableHeader(cols)

  lines.forEach((l, idx) => {
    builder.checkPageBreak(18, cols)
    const { doc, margin } = builder

    if (idx % 2 === 1) {
      doc.setFillColor(...BRAND.ZEBRA_BG)
      doc.rect(margin, builder.y - 10, builder.printableWidth, 16, 'F')
    }

    const unitPrice = l.costPerUnit ?? (l.category === 'Drapery & Fabrics' ? 350 : 180)
    const required = l.quantityNeeded ?? Math.max(0, l.threshold - l.currentStock)
    const lineCost = required * unitPrice

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND.FOREGROUND)

    doc.text(l.itemName.slice(0, 20), margin + 6, builder.y)
    doc.text((l.eventTitle || l.triggerSource).slice(0, 18), margin + 131, builder.y)

    doc.text(`${l.currentStock} / ${l.threshold}`, margin + 241 + 37, builder.y, { align: 'center' })
    doc.text(`₱${lineCost.toLocaleString()}`, margin + 316 + 64, builder.y, { align: 'right' })

    // Priority Badge
    const prioColor = l.priority === 'Critical' || l.priority === 'High' ? BRAND.DANGER : l.priority === 'Medium' ? BRAND.WARNING : BRAND.MUTED
    doc.setTextColor(...prioColor)
    doc.setFont('helvetica', 'bold')
    doc.text(l.priority.slice(0, 10), margin + 386 + 32, builder.y, { align: 'center' })

    // Status Badge
    const statusColor = getStatusRGB(l.status)
    doc.setTextColor(...statusColor)
    doc.text(l.status.slice(0, 14), margin + 451 + 81, builder.y, { align: 'right' })

    builder.y += 16
  })

  builder.save('replenishment-deficit-report.pdf')
}

// ─── 6. Replenishment Procurement Register PDF Exporter ───
export function exportReplenishmentProcurementPdf(items: ProcurementItem[]) {
  const builder = new PdfReportBuilder()
  builder.drawHeader('PROCUREMENT REGISTER & STOCK AUDIT', [
    `Total Register Items: ${items.length} inventory lines`,
    'Scope: Master Procurement & Low-Stock Threshold Register',
  ])

  const cols: ColumnDef[] = [
    { header: 'Asset ID', width: 75 },
    { header: 'Item Name', width: 147 },
    { header: 'Category', width: 110 },
    { header: 'Stock/Thresh', width: 70, align: 'center' },
    { header: 'Stock %', width: 50, align: 'center' },
    { header: 'Status', width: 80, align: 'right' },
  ]

  builder.drawTableHeader(cols)

  items.forEach((p, idx) => {
    builder.checkPageBreak(18, cols)
    const { doc, margin } = builder

    if (idx % 2 === 1) {
      doc.setFillColor(...BRAND.ZEBRA_BG)
      doc.rect(margin, builder.y - 10, builder.printableWidth, 16, 'F')
    }

    const pct = p.threshold > 0 ? Math.round((p.currentStock / p.threshold) * 100) : 100

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND.FOREGROUND)

    doc.text(p.assetId, margin + 6, builder.y)
    doc.text(p.name.slice(0, 24), margin + 81, builder.y)
    doc.text(p.category.slice(0, 18), margin + 228, builder.y)
    doc.text(`${p.currentStock} / ${p.threshold}`, margin + 338 + 35, builder.y, { align: 'center' })
    doc.text(`${pct}%`, margin + 408 + 25, builder.y, { align: 'center' })

    const statusColor = getStatusRGB(p.status)
    doc.setTextColor(...statusColor)
    doc.setFont('helvetica', 'bold')
    doc.text(p.status.slice(0, 15), margin + 458 + 74, builder.y, { align: 'right' })

    builder.y += 16
  })

  builder.save('lumiere-procurement-register.pdf')
}

// ─── 7. New Manning Delegation / Crew Roster PDF Exporter ───
export interface CrewRosterExportMember {
  name: string
  role: string
  department: 'Field' | 'Warehouse' | 'Production'
  isTeamLead: boolean
  assignmentDate?: string
  dutyCategory?: string
  status?: string
}

export function exportCrewRosterPdf(
  eventInfo: {
    eventTitle: string
    venue: string
    targetDate: string
  },
  crewList: CrewRosterExportMember[],
) {
  const builder = new PdfReportBuilder()
  const leadsCount = crewList.filter((c) => c.isTeamLead).length

  builder.drawHeader('EVENT CREW ROSTER & MANNING DELEGATION', [
    `EVENT: ${eventInfo.eventTitle.toUpperCase()}`,
    `Venue: ${eventInfo.venue}   |   Target Date: ${eventInfo.targetDate}`,
    `Total Crew Allocated: ${crewList.length} staff (${leadsCount} Team Lead${leadsCount === 1 ? '' : 's'})`,
  ])

  const cols: ColumnDef[] = [
    { header: 'Staff Name', width: 110 },
    { header: 'Role / Designation', width: 115 },
    { header: 'Department / Zone', width: 105 },
    { header: 'Lead Status', width: 70, align: 'center' },
    { header: 'Duty / Date', width: 72 },
    { header: 'Ground Sign-Off', width: 60, align: 'center' },
  ]

  // Group crew members by department
  const departments: Array<'Field' | 'Warehouse' | 'Production'> = ['Field', 'Warehouse', 'Production']

  departments.forEach((dept) => {
    const deptMembers = crewList.filter((c) => c.department === dept)
    if (deptMembers.length === 0) return

    builder.checkPageBreak(35, cols)
    const { doc, margin } = builder

    // Department Sub-Section Header
    doc.setFillColor(...BRAND.PRIMARY)
    doc.rect(margin, builder.y, 3, 14, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...BRAND.FOREGROUND)
    doc.text(`${dept.toUpperCase()} DEPARTMENT CREW (${deptMembers.length})`, margin + 8, builder.y + 11)
    builder.y += 18

    builder.drawTableHeader(cols)

    deptMembers.forEach((member, idx) => {
      builder.checkPageBreak(18, cols)

      if (idx % 2 === 1) {
        doc.setFillColor(...BRAND.ZEBRA_BG)
        doc.rect(margin, builder.y - 10, builder.printableWidth, 16, 'F')
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...BRAND.FOREGROUND)

      doc.text(member.name.slice(0, 18), margin + 6, builder.y)
      doc.text(member.role.slice(0, 20), margin + 116, builder.y)
      doc.text(`${member.department} ${member.dutyCategory ? `· ${member.dutyCategory}` : ''}`.slice(0, 18), margin + 231, builder.y)

      // Team Lead Status Badge
      if (member.isTeamLead) {
        doc.setFillColor(...BRAND.PRIMARY)
        doc.roundedRect(margin + 336 + 8, builder.y - 8, 54, 12, 3, 3, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(...BRAND.WHITE)
        doc.text('TEAM LEAD', margin + 336 + 35, builder.y, { align: 'center' })
      } else {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...BRAND.MUTED)
        doc.text('Crew', margin + 336 + 35, builder.y, { align: 'center' })
      }

      // Duty / Date
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...BRAND.FOREGROUND)
      doc.text(member.assignmentDate || eventInfo.targetDate, margin + 406 + 6, builder.y)

      // Sign-off Checkbox Line
      doc.setDrawColor(...BRAND.BORDER)
      doc.setLineWidth(0.75)
      doc.rect(margin + 478 + 24, builder.y - 7, 10, 10)

      builder.y += 16
    })

    builder.y += 10
  })

  const filename = `crew-roster-${eventInfo.eventTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`
  builder.save(filename)
}
