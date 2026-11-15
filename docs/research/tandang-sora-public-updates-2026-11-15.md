# Barangay 12 Tandang Sora (Poblacion), Butuan City — verified public update archive

Research and live database audit: 2026-11-15. This inventory is **not** an exhaustive collection of all past barangay announcements. It lists only the indexed government sources verified during the review, in a dedicated `tandang_sora_source_archive` table. The program and organization sections do **not** imply current registration or current legal status.

## Why the PWA previously displayed zero

Resident PWA only queried programs with `status='Active' AND is_public=true` and organizations with `status='Active'`. Live staff registry had 9 Inactive/private programs, 2 On Hold historical organizations, and 1 unsourced Active test record. Three old `Published` announcement rows had null `published_by` and no confirmed event dates or source; they were marked `Archived` without deletion, and the test organization was marked Inactive.

## Sourced report archive (7 historical news items)

| Date / event | Report | Official source |
| --- | --- | --- |
| 2026-07-27 | SK Tandang Sora included among 10 timely FY2026 budget-submitting councils | [City Government of Butuan](https://www.butuan.gov.ph/%F0%9D%97%A6%F0%9D%97%9E-%F0%9D%97%A6%F0%9D%97%94-%F0%9D%97%95%F0%9D%97%A8%F0%9D%97%A7%F0%9D%97%A8%F0%9D%97%94%F0%9D%97%A1-%F0%9D%97%9A%F0%9D%97%9C%F0%9D%97%97%F0%9D%97%94%F0%9D%97%AC%F0%9D%97%98/) |
| 2026-07-22 | 2026 rice distribution covered Barangay Tandang Sora among 15 Butuan barangays; held at Doongan | [Philippine Information Agency](https://pia.gov.ph/news/15-barangays-in-butuan-city-receive-over-4000-kilos-of-rice-from-pbbm-program/) |
| 2026-06-07 event | BLGU Tandang Sora named as a partner in Masao Beach coastal clean-up; venue was Masao, not Tandang Sora | [DENR-EMB Caraga](https://caraga.emb.gov.ph/in-a-unified-action-denr-and-partners-rally-for-coastal-clean-up-at-masao-beach/) |
| 2025-05-27 | Champion basketball Cluster 2 included Tandang Sora | [City Government of Butuan](https://www.butuan.gov.ph/%F0%9D%97%96%F0%9D%97%9F%F0%9D%97%A8%F0%9D%97%A6%F0%9D%97%A7%F0%9D%97%98%F0%9D%97%A5-%F0%9D%9F%AE-%F0%9D%97%A0%F0%9D%97%9C%F0%9D%97%9E%F0%9D%97%94%F0%9D%97%A0%F0%9D%97%A3%F0%9D%97%98%F0%9D%97%A2/) |
| 2023-10-10 | Tandang Sora senior folk dancers first runner-up at 2023 Elderly Filipino Week | [City Government of Butuan](https://www.butuan.gov.ph/%F0%9D%97%A0%F0%9D%97%9A%F0%9D%97%94-%F0%9D%97%A6%F0%9D%97%98%F0%9D%97%A1%F0%9D%97%9C%F0%9D%97%A2%F0%9D%97%A5-%F0%9D%97%96%F0%9D%97%9C%F0%9D%97%A7%F0%9D%97%9C%F0%9D%97%AD%F0%9D%97%98%F0%9D%97%A1-2/) |
| 2023-05-05 | Purok 5 Zacor Main Road closure for construction through June 2023; **not current** | [City Government of Butuan](https://www.butuan.gov.ph/%F0%9D%97%A7%F0%9D%97%98%F0%9D%97%A0%F0%9D%97%A3%F0%9D%97%A2%F0%9D%97%A5%F0%9D%97%94%F0%9D%97%A5%F0%9D%97%AC%F0%9D%97%A2%F0%9D%97%A1%F0%9D%97%9A-%F0%9D%97%A3%F0%9D%97%94%F0%9D%97%9A%F0%9D%97%A6-3/) |
| 2023-03-16 | Buntis Congress / Safe Motherhood event in Barangay Tandang Sora | [City Government of Butuan](https://www.butuan.gov.ph/%F0%9D%9F%AD%F0%9D%9F%B1%F0%9D%9F%AC-%F0%9D%97%9E%F0%9D%97%94-%F0%9D%97%A0%F0%9D%97%9A%F0%9D%97%94-%F0%9D%97%95%F0%9D%97%A8%F0%9D%97%A1%F0%9D%97%A7%F0%9D%97%9C%F0%9D%97%A6-%F0%9D%97%A0%F0%9D%97%9C/) |

## Program archive (9 referenced, 0 open registrations)

Five direct historical barangay involvement/coverage records are backed by the reports above: rice distribution, Masao cleanup partnership, 2025 basketball, 2023 folk dance, and 2023 Buntis Congress. Four more **Butuan Citywide opportunity references** (livelihood, skills training, SPES, TUPAD) are mentioned in the [2026-03-12 City Government Lawig Barangay report](https://www.butuan.gov.ph/?p=17165), **not** as confirmed Tandang Sora-specific enrollments.

## Organizations (2 historically documented)

- Caraga Federation of Homeowners Association, Inc., address Purok 5, Tandang Sora, accreditation SP Resolution 152-2022 on 2022-08-30: [City Government Ecological Statistics Yearbook 2022, p.277](https://www.butuan.gov.ph/wp-content/uploads/2024/10/Approved%20Butuan%20City%20Ecological%20Statistics%20Yearbook%20202266fb43e1a7374.pdf)
- CORE Group Consultancy, Inc., listed with Tandang Sora Butuan address in 2022 Provincial Resolution 2022-078: [Agusan del Norte Provincial Government Archive](https://dams.agusandelnorte.gov.ph/dams/public/resolution?page=434)

Neither record supports a claim about **current officers, active 2026 chapters, membership, or enrollment**.

## Safeguards

- Official `announcements` is *separate* from sourced historic news. Importing source news cannot notify residents because this table has no announcement notification trigger.
- Existing active programs and status-controlled applications remain unchanged; no false event signup is created.
- Public users can read only archive rows with `is_public=true` (RLS). Only authenticated staff can mutate the archive; anonymous INSERT is revoked.
- Sources are URLs from Government of Butuan, PIA, DENR-EMB Caraga or Provincial Government of Agusan del Norte.
- PWA uses versioned offline cache keys so old unverified notices and sample organizations cannot resurface from old snapshots.
- This is **curated searchable public material**, not official barangay authority confirmation or a guarantee that *every* internet announcement was found.
