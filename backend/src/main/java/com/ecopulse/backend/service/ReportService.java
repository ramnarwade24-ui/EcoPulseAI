package com.ecopulse.backend.service;

import com.ecopulse.backend.model.User;
import com.ecopulse.backend.repository.EmissionRepository;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

@Service
public class ReportService {
    private final EmissionRepository emissionRepository;
    private final EmissionService emissionService;

    public ReportService(EmissionRepository emissionRepository, EmissionService emissionService) {
        this.emissionRepository = emissionRepository;
        this.emissionService = emissionService;
    }

    public byte[] generateEsgPdf(User user, Instant from, Instant to) {
        var formatter = DateTimeFormatter.ISO_LOCAL_DATE.withZone(ZoneOffset.UTC);
        var summary = emissionService.summary(user.getId(), from, to);

        try (var out = new ByteArrayOutputStream()) {
            var doc = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(doc, out);
            doc.open();

            var title = new Paragraph("EcoPulse AI – ESG Emissions Report", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16));
            doc.add(title);
            doc.add(new Paragraph("User: " + user.getEmail()));
            doc.add(new Paragraph("Period: " + (from == null ? "(all)" : formatter.format(from)) + " → " + (to == null ? "(now)" : formatter.format(to))));
            doc.add(Chunk.NEWLINE);

            var kpis = new PdfPTable(2);
            kpis.setWidthPercentage(100);
            kpis.addCell(cell("Total tokens"));
            kpis.addCell(cell(String.valueOf(summary.totalTokens())));
            kpis.addCell(cell("Energy (kWh)"));
            kpis.addCell(cell(summary.totalEnergyKwh().toPlainString()));
            kpis.addCell(cell("CO2 (grams)"));
            kpis.addCell(cell(summary.totalCo2Grams().toPlainString()));
            kpis.addCell(cell("Water (liters)"));
            kpis.addCell(cell(summary.totalWaterLiters().toPlainString()));
            doc.add(kpis);
            doc.add(Chunk.NEWLINE);

            doc.add(new Paragraph("Recent emission logs", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12)));
            var table = new PdfPTable(5);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{2.2f, 2.0f, 1.2f, 2.0f, 1.0f});
            table.addCell(header("Time"));
            table.addCell(header("Model"));
            table.addCell(header("Tokens"));
            table.addCell(header("CO2 (g)"));
            table.addCell(header("Score"));

            var logs = emissionRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), org.springframework.data.domain.Pageable.ofSize(25)).getContent();
            for (var log : logs) {
                var ts = log.getCreatedAt();
                if ((from != null && ts.isBefore(from)) || (to != null && ts.isAfter(to))) continue;
                table.addCell(cell(formatter.format(ts)));
                table.addCell(cell(log.getModel()));
                table.addCell(cell(String.valueOf(log.getTokens())));
                table.addCell(cell(log.getCo2Grams().stripTrailingZeros().toPlainString()));
                table.addCell(cell(String.valueOf(log.getGreenScore())));
            }
            doc.add(table);

            doc.add(Chunk.NEWLINE);
            doc.add(new Paragraph("Notes", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12)));
            doc.add(new Paragraph("This report is generated from recorded AI usage and estimated regional carbon intensity."));
            doc.add(new Paragraph("For higher accuracy, plug in measured power data and provider-specific emission factors."));

            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate PDF", e);
        }
    }

    public ReportSummary summary(User user, Instant from, Instant to) {
        var s = emissionService.summary(user.getId(), from, to);
        return new ReportSummary(s.totalTokens(), s.totalEnergyKwh(), s.totalCo2Grams(), s.totalWaterLiters());
    }

    private static PdfPCell header(String text) {
        var cell = new PdfPCell(new Phrase(text, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
        cell.setBackgroundColor(new java.awt.Color(240, 240, 240));
        return cell;
    }

    private static PdfPCell cell(String text) {
        return new PdfPCell(new Phrase(text == null ? "" : text, FontFactory.getFont(FontFactory.HELVETICA, 10)));
    }

    public record ReportSummary(long totalTokens, BigDecimal totalEnergyKwh, BigDecimal totalCo2Grams, BigDecimal totalWaterLiters) {}
}
