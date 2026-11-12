"""Mission report PDF (ReportLab + Matplotlib). Input is the client plan + cached analysis results."""

from __future__ import annotations

import io
from datetime import UTC, datetime

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.data import registry
from app.science import catalogues as C
from app.science import terrain as T

BG = colors.HexColor("#0b0d12")
PANEL = colors.HexColor("#161a22")
ACCENT = colors.HexColor("#c2410c")
CYAN = colors.HexColor("#22d3ee")
TEXT = colors.HexColor("#e5e7eb")
MUTED = colors.HexColor("#9ca3af")


def _styles():
    ss = getSampleStyleSheet()
    base = ParagraphStyle("base", parent=ss["Normal"], fontName="Helvetica", fontSize=9.5, leading=13, textColor=TEXT)
    return {
        "base": base,
        "muted": ParagraphStyle("muted", parent=base, fontSize=8, leading=11, textColor=MUTED),
        "h1": ParagraphStyle("h1", parent=base, fontName="Helvetica-Bold", fontSize=22, leading=26, textColor=colors.white, spaceAfter=4),
        "h2": ParagraphStyle("h2", parent=base, fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=colors.HexColor("#fb923c"), spaceBefore=10, spaceAfter=4),
        "h3": ParagraphStyle("h3", parent=base, fontName="Helvetica-Bold", fontSize=10.5, leading=13, textColor=CYAN, spaceBefore=6, spaceAfter=2),
        "warn": ParagraphStyle("warn", parent=base, textColor=colors.HexColor("#fca5a5")),
    }


def _bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BG)
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    canvas.setFillColor(ACCENT)
    canvas.rect(0, A4[1] - 6 * mm, A4[0], 6 * mm, stroke=0, fill=1)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(15 * mm, 8 * mm, "MARSENSE - Martian Survival Navigator - research prototype; not a certified mission assessment")
    canvas.drawRightString(A4[0] - 15 * mm, 8 * mm, f"Page {doc.page}")
    canvas.restoreState()


def _fig_to_img(fig, width_mm=180) -> Image:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=160, facecolor=fig.get_facecolor(), bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    img = Image(buf)
    ratio = img.imageHeight / img.imageWidth
    img.drawWidth = width_mm * mm
    img.drawHeight = width_mm * mm * ratio
    return img


def _dark_ax(figsize=(8, 3.2)):
    fig, ax = plt.subplots(figsize=figsize, facecolor="#161a22")
    ax.set_facecolor("#0b0d12")
    for sp in ax.spines.values():
        sp.set_color("#374151")
    ax.tick_params(colors="#9ca3af", labelsize=8)
    ax.xaxis.label.set_color("#9ca3af")
    ax.yaxis.label.set_color("#9ca3af")
    ax.title.set_color("#e5e7eb")
    ax.grid(color="#1f2937", linewidth=0.5)
    return fig, ax


def _route_map(plan: dict) -> Image | None:
    g = T.store.primary
    route = plan.get("route")
    base = plan.get("base")
    if g is None or not base:
        return None
    lons = [base["lon"]]
    lats = [base["lat"]]
    if route and route.get("geometry"):
        cs = route["geometry"]["coordinates"]
        lons += [c[0] for c in cs]
        lats += [c[1] for c in cs]
    pad = 0.015
    w, e, s, n = min(lons) - pad, max(lons) + pad, min(lats) - pad, max(lats) + pad
    win = g.window(max(w, g.west), max(s, g.south), min(e, g.east), min(n, g.north))
    fig, ax = _dark_ax((8, 6))
    if win:
        sub = g.data[win]
        r0, c0 = win[0].start, win[1].start
        ext = [g.west + c0 * g.dlon, g.west + win[1].stop * g.dlon, g.north - win[0].stop * g.dlat, g.north - r0 * g.dlat]
        ax.imshow(sub, extent=ext, cmap="gist_earth", origin="upper", aspect=1 / np.cos(np.radians(base["lat"])))
        sl = g.slope[win]
        ax.contourf(np.linspace(ext[0], ext[1], sub.shape[1]), np.linspace(ext[3], ext[2], sub.shape[0]), np.nan_to_num(sl, nan=0), levels=[20, 90], colors=["#ef4444"], alpha=0.35)
    if route and route.get("geometry"):
        cs = np.array(route["geometry"]["coordinates"])
        ax.plot(cs[:, 0], cs[:, 1], color="#22d3ee", lw=2, label=f"Route ({route.get('strategy')})")
    ax.plot(base["lon"], base["lat"], marker="^", color="#fb923c", ms=10, label="Base")
    for tid in plan.get("targets", []):
        t = C.target_by_id(tid)
        if t:
            ax.plot(t["lon"], t["lat"], marker="*", color="#fde68a", ms=9)
            ax.annotate(t["name"], (t["lon"], t["lat"]), color="#fde68a", fontsize=7, xytext=(4, 4), textcoords="offset points")
    ax.set_xlim(w, e)
    ax.set_ylim(s, n)
    ax.set_xlabel("Longitude (°E)")
    ax.set_ylabel("Latitude (°N)")
    ax.set_title("Route map on CTX DTM (red = slope > 20°)")
    ax.legend(loc="lower right", fontsize=7, facecolor="#161a22", labelcolor="#e5e7eb", edgecolor="#374151")
    return _fig_to_img(fig, 170)


def _profile_chart(route: dict) -> Image | None:
    prof = route.get("profile") or []
    pts = [(p["d"], p["z"], p["slope"]) for p in prof if p.get("z") is not None]
    if len(pts) < 2:
        return None
    d, z, s = zip(*pts)
    fig, ax = _dark_ax()
    ax.plot(np.array(d) / 1000, z, color="#22d3ee", lw=1.5)
    ax.fill_between(np.array(d) / 1000, z, min(z) - 5, color="#22d3ee", alpha=0.15)
    ax.set_xlabel("Distance (km)")
    ax.set_ylabel("Elevation (m, MOLA areoid)")
    ax2 = ax.twinx()
    ax2.plot(np.array(d) / 1000, [x if x is not None else 0 for x in s], color="#fb923c", lw=0.8, alpha=0.8)
    ax2.set_ylabel("Slope (°)", color="#fb923c")
    ax2.tick_params(colors="#9ca3af", labelsize=8)
    ax.set_title("Elevation profile")
    return _fig_to_img(fig)


def _survival_chart(sim: dict) -> Image | None:
    tl = sim.get("timeline") or []
    if not tl:
        return None
    fig, ax = _dark_ax()
    days = [p["day"] for p in tl]
    for key, col in (("oxygen", "#22d3ee"), ("water", "#60a5fa"), ("power", "#fbbf24"), ("co2_scrubber", "#a78bfa"), ("food", "#34d399")):
        init = sim["summary"][key]["initial"] or 1
        ax.plot(days, [100 * p[key] / init for p in tl], color=col, lw=1.4, label=sim["summary"][key]["label"].split(" (")[0])
    ax.axhline(100 * sim["supplies"]["emergency_reserve_fraction"], color="#ef4444", ls="--", lw=0.8)
    ax.axhline(0, color="#ef4444", lw=0.8)
    ax.set_ylim(-5, 105)
    ax.set_xlabel("Mission day")
    ax.set_ylabel("Remaining (%)")
    ax.set_title(f"Resource timeline - {sim['scenario']['name']}")
    ax.legend(fontsize=7, facecolor="#161a22", labelcolor="#e5e7eb", edgecolor="#374151", ncol=5, loc="lower left")
    return _fig_to_img(fig)


def _table(rows, col_widths=None, header=True):
    t = Table(rows, colWidths=col_widths, hAlign="LEFT")
    style = [("BACKGROUND", (0, 0), (-1, -1), PANEL), ("TEXTCOLOR", (0, 0), (-1, -1), TEXT), ("FONTSIZE", (0, 0), (-1, -1), 8.5),
             ("FONTNAME", (0, 0), (-1, -1), "Helvetica"), ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#374151")),
             ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5)]
    if header:
        style += [("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")), ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#fb923c"))]
    t.setStyle(TableStyle(style))
    return t


def build_report(req: dict) -> bytes:
    st = _styles()
    P = lambda txt, s="base": Paragraph(str(txt), st[s])
    plan = req["plan"]
    assess = req.get("assessment") or {}
    sim = req.get("simulation")
    landing_res = req.get("landing")
    base = plan.get("base") or {}
    route = plan.get("route")
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm, topMargin=18 * mm, bottomMargin=16 * mm,
                            title=f"MARSENSE Mission Report - {req['mission_name']}")
    el = []
    el.append(P("MARSENSE MISSION REPORT", "h1"))
    el.append(P(f"<b>{req['mission_name']}</b> &nbsp;|&nbsp; Region: Jezero Crater, Mars &nbsp;|&nbsp; Generated {datetime.now(UTC).strftime('%Y-%m-%d %H:%M UTC')}", "muted"))
    el.append(Spacer(1, 6))
    if assess:
        verdict = assess.get("verdict", "n/a").replace("_", " ").upper()
        el.append(_table([["Overall feasibility", "Confidence", "Verdict", "Scenario"],
                          [f"{assess.get('overall_score')}/100", f"{assess.get('confidence')}", verdict, assess.get("scenario", "")]], [45 * mm, 35 * mm, 55 * mm, 45 * mm]))
    el.append(P("1. Mission configuration", "h2"))
    rows = [["Parameter", "Value"], ["Base location", f"{base.get('lat', 0):.5f}°N, {base.get('lon', 0):.5f}°E" if base else "not set"]]
    if base:
        insp = T.inspect_point(base["lon"], base["lat"], T.Thresholds.rover())
        if insp["covered"]:
            rows.append(["Base elevation / slope", f"{insp['elevation_m']} m / {insp['slope_deg']}° ({insp['dataset_id']})"])
    sup = plan.get("supplies", {})
    rows += [["Crew / duration", f"{sup.get('crew', '?')} astronauts, {sup.get('duration_days', '?')} days (+{sup.get('return_journey_days', 0)} return)"],
             ["Mobility profile", plan.get("profile", "rover")],
             ["Science targets", ", ".join(t["name"] for t in (C.target_by_id(i) for i in plan.get("targets", [])) if t) or "none selected"]]
    el.append(_table(rows, [55 * mm, 125 * mm]))

    el.append(P("2. Route", "h2"))
    if route:
        el.append(_table([["Strategy", "Length", "Climb / descent", "Max slope", "Hazardous", "Est. duration", "Verified"],
                          [route.get("strategy"), f"{route.get('length_m', 0)/1000:.2f} km", f"{route.get('climb_m')} / {route.get('descent_m')} m",
                           f"{route.get('max_slope_deg')}°", f"{route.get('hazard_m', 0):.0f} m", f"{route.get('estimated_duration_h')} h", "yes" if route.get("verified") else "NO"]]))
        el.append(Spacer(1, 4))
        el.append(P(route.get("explanation", ""), "muted"))
        img = _route_map(plan)
        if img:
            el.append(Spacer(1, 4))
            el.append(img)
        prof = _profile_chart(route)
        if prof:
            el.append(prof)
        if route.get("hazard_segments"):
            el.append(P("Hazard segments", "h3"))
            el.append(_table([["From (m)", "To (m)", "Class", "Max slope"]] + [[f"{h['start_m']:.0f}", f"{h['end_m']:.0f}", h["class"], f"{h['max_slope']}°"] for h in route["hazard_segments"][:15]]))
    else:
        el.append(P("No route planned.", "warn"))

    el.append(PageBreak())
    el.append(P("3. Terrain assessment", "h2"))
    terr = (assess.get("categories") or {}).get("terrain")
    if terr:
        el.append(P(terr["explanation"]))
        fr = terr["inputs"].get("class_fractions")
        if fr:
            el.append(_table([["Benign", "Caution", "Hazardous", "Impassable", "Slope p90", "Source"],
                              [f"{100*fr['benign']:.0f}%", f"{100*fr['caution']:.0f}%", f"{100*fr['hazardous']:.0f}%", f"{100*fr['impassable']:.0f}%",
                               f"{terr['inputs'].get('slope_p90_deg')}°", f"{terr['inputs'].get('dataset')} @ {terr['inputs'].get('resolution_m')} m"]]))
    if landing_res:
        el.append(P("Candidate site comparison", "h3"))
        rows = [["Site", "Score", "Confidence", "Verdict", "Slope p90", "Roughness p90"]]
        for s_ in landing_res.get("sites", []):
            f = s_["factors"]
            rows.append([s_["name"], s_["overall_score"], s_["confidence"], s_["verdict"], f.get("slope", {}).get("value", "-"), f.get("roughness", {}).get("value", "-")])
        el.append(_table(rows))

    el.append(P("4. Resource simulation", "h2"))
    if sim:
        el.append(P(f"Scenario: <b>{sim['scenario']['name']}</b> - {sim['scenario']['description']} Total {sim['total_days']} days."))
        rows = [["Resource", "Initial", "Consumed", "Remaining", "Days to depletion", "Margin", "Status"]]
        for k, v in sim["summary"].items():
            rows.append([v["label"], v["initial"], v["consumed"], v["remaining_at_end"], v["days_to_depletion"], v["margin_days"], v["status"].upper()])
        el.append(_table(rows))
        img = _survival_chart(sim)
        if img:
            el.append(img)
        a = sim["assumptions"]
        el.append(P("Assumptions", "h3"))
        el.append(P(f"O2 {a['o2_kg_per_day']} kg/person/day (EVA x{a['o2_eva_multiplier']}), CO2 {a['co2_kg_per_day']} kg/p/d, water {a['water_kg_per_day']}+{a['hygiene_water_kg_per_day']} kg/p/d "
                    f"(recycling {100*a['water_recycling_efficiency']:.0f}%), food {a['food_kg_per_day']} kg/p/d, habitat {a['habitat_power_kw']} kW, EVA {a['eva_hours_per_day']} h/day, "
                    f"rover {a['rover_km_per_day']} km/day at {a['rover_kwh_per_km']} kWh/km, solar {a['solar_recharge_kwh_per_sol']} kWh/sol.", "muted"))
        for src in a.get("sources", []):
            el.append(P("- " + src, "muted"))
        for w in sim.get("warnings", []):
            el.append(P(f"[{w['severity'].upper()}] {w['message']}", "warn"))
    else:
        el.append(P("No simulation run.", "warn"))

    el.append(P("5. Environmental observations (historical)", "h2"))
    from app.science import environment as E

    meda = E.meda_summary()
    rad = E.rad_summary()
    if meda["records"]:
        r = meda["range"]
        el.append(P(f"MEDA (Perseverance, Jezero), sols {r['sols'][0]}-{r['sols'][1]} sampled: air temperature {r['air_temp_c']['min']} to {r['air_temp_c']['max']} °C; "
                    f"pressure {r['pressure_pa']['min']} to {r['pressure_pa']['max']} Pa. {meda['coverage_note']}"))
    if rad["records"]:
        el.append(P(f"RAD (Curiosity, Gale crater - reference only, {rad['site']['distance_to_jezero_km']} km from Jezero): mean dose rate {rad['typical_dose_rate_E_uGy_h']} µGy/h "
                    f"≈ {rad['typical_dose_per_sol_E_uGy']} µGy/sol (detector E). {rad['published_reference']}"))
    el.append(P(meda["no_realtime_note"], "muted"))

    el.append(P("6. Mission assessment", "h2"))
    if assess:
        rows = [["Category", "Score", "Confidence", "Explanation"]]
        for k, c in assess["categories"].items():
            rows.append([k.replace("_", " "), c["score"], c["confidence"], Paragraph(c["explanation"], st["muted"])])
        el.append(_table(rows, [35 * mm, 18 * mm, 22 * mm, 105 * mm]))
        for cap in assess.get("caps_applied", []):
            el.append(P(cap, "warn"))
        if assess.get("critical_warnings"):
            el.append(P("Critical warnings", "h3"))
            for w in assess["critical_warnings"]:
                el.append(P("- " + w, "warn"))
        if assess.get("recommendations"):
            el.append(P("Recommended changes", "h3"))
            for w in assess["recommendations"]:
                el.append(P("- " + w))
    else:
        el.append(P("No assessment computed.", "warn"))

    el.append(P("7. Data sources and attribution", "h2"))
    rows = [["Dataset", "Instrument", "Resolution", "Reliability", "Attribution"]]
    for ds in registry.DATASETS.values():
        rows.append([Paragraph(ds.name, st["muted"]), Paragraph(ds.instrument, st["muted"]), Paragraph(ds.resolution, st["muted"]), ds.reliability.value, Paragraph(ds.attribution, st["muted"])])
    el.append(_table(rows, [45 * mm, 35 * mm, 25 * mm, 28 * mm, 47 * mm]))

    el.append(P("8. Limitations", "h2"))
    for lim in [
        "Terrain hazards are derived from a 20 m/px DTM: rocks, ripples and scarps smaller than ~60 m are not resolved.",
        "The survival model is a simplified mass balance; it omits leaks, thermal control, medical events and many failure modes.",
        "Environmental values are archived measurements (MEDA at Jezero; RAD at Gale crater), not forecasts.",
        "Mineral and target information is a literature synthesis; evidence of ancient water is not evidence of extractable water today.",
        "Scores are research estimates; they are not NASA-certified landing-site, route or life-support assessments.",
    ]:
        el.append(P("- " + lim, "muted"))
    doc.build(el, onFirstPage=_bg, onLaterPages=_bg)
    return buf.getvalue()
