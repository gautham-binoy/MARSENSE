import asyncio
import json
import os
import subprocess
import edge_tts

VOICE = "en-US-ChristopherNeural"

SCENES = [
    {
        "id": "scene01_mission_control",
        "title": "Mission Control & Mars Chronometry",
        "text": (
            "Welcome to MARSENSE, the Martian Survival Navigator. "
            "Developed for the NASA Space Apps Challenge, MARSENSE answers a fundamental question: "
            "Can astronauts safely explore a selected region of Mars, achieve their scientific objectives, manage their life-support resources, and return safely? "
            "Here in Mission Control, an interactive 3D globe renders the planet, focused on Jezero Crater. "
            "At the top, our Allison and McEwen chronometry instrument tracks real-time Mars Sol Dates, Local True Solar Time, and solar longitude, alerting crew to perihelion dust storm seasons. "
            "Live telemetry streams the positions and odometry of the Perseverance rover and Ingenuity helicopter, while our mission readiness deck monitors real-time crew parameters."
        ),
    },
    {
        "id": "scene02_mars_explorer",
        "title": "Mars Explorer & Layer Intelligence",
        "text": (
            "Switching to Mars Explorer, we navigate the high-resolution Martian surface. "
            "The GIS layer catalogue integrates authentic NASA datasets: the USGS Mars 2020 CTX digital terrain mosaic at twenty meters per pixel, "
            "CRISM aqueous mineralogy, THEMIS thermal inertia, and HRSC color mosaics. "
            "Clicking any point activates the location inspector, calculating areoid elevation, Horn finite-difference slope, "
            "and Riley terrain ruggedness index, while identifying nearby scientific targets and allowing instant bookmarking."
        ),
    },
    {
        "id": "scene03_terrain_intelligence",
        "title": "Terrain Intelligence & Elevation Transects",
        "text": (
            "In Terrain Intelligence, MARSENSE evaluates surface traversability across selected bounding boxes. "
            "It computes slope distributions and terrain classifications, distinguishing benign flats from hazardous escarpments. "
            "Using our Elevation Transect Tool, mission planners sample high-resolution micro-topography along cross-sections, "
            "such as the Western Delta scarp. "
            "Interactive charts plot elevation profiles and local slopes against a fifteen-degree hazard threshold, "
            "with instant one-click CSV data export."
        ),
    },
    {
        "id": "scene04_landing_sites",
        "title": "Landing Site & Habitat Base Selection",
        "text": (
            "Selecting a safe habitat base is vital for expedition survival. "
            "The Landing Sites engine performs multi-criteria decision analysis across candidate locations, "
            "including Octavia E. Butler landing site, the Western Delta front, and South Séítah. "
            "Planners adjust factor weights for slope, roughness, scientific proximity, and resource potential. "
            "The system ranks candidate sites, identifies the optimal habitat location, and locks it into the active flight plan."
        ),
    },
    {
        "id": "scene05_science_discovery",
        "title": "Planetary Science & Sample Depot",
        "text": (
            "Scientific payoff drives human planetary exploration. "
            "Our Science Discovery catalogue details high-priority astrobiological targets, carbonate units, and fluvial deposits in Jezero. "
            "Planners can search targets, filter by geological class, and bulk-select four-star objectives for traverse planning. "
            "MARSENSE also incorporates the Three Forks Mars Sample Return depot, cataloguing sealed sample tubes, "
            "core lengths, petrological units, and astrobiological significance for future retrieval."
        ),
    },
    {
        "id": "scene06_water_resources",
        "title": "Water Resources & ISRU Chemical Plant",
        "text": (
            "MARSENSE provides scientific honesty regarding Martian volatiles. "
            "Orbital radar from SHARAD and neutron spectroscopy confirm there is no accessible near-surface ice at eighteen degrees north. "
            "Hydrated signatures indicate ancient clay minerals, not extractable water. "
            "To solve this, our In-Situ Resource Utilization simulator models atmospheric solid oxide electrolysis via MOXIE, "
            "converting atmospheric carbon dioxide into breathable oxygen and ascent propellant."
        ),
    },
    {
        "id": "scene07_environment_radiation",
        "title": "Atmospheric Environment & Radiation",
        "text": (
            "Surviving on Mars requires understanding its harsh environment. "
            "The Environment module visualizes calibrated historical records from Perseverance's MEDA weather station, "
            "revealing diurnal temperature swings exceeding seventy degrees Celsius and atmospheric pressures around seven millibars. "
            "Surface radiation telemetry from Curiosity's RAD instrument models galactic cosmic ray background and solar particle events, "
            "projecting cumulative tissue dose across the expedition duration."
        ),
    },
    {
        "id": "scene08_route_planner",
        "title": "Terrain-Aware Route Planner",
        "text": (
            "Traverse planning requires terrain-aware navigation. "
            "Our route planner employs an A-star pathfinding algorithm over twenty-meter DTM grids, "
            "applying exponential cost penalties to steep slopes and rugged boulder fields. "
            "Planners sequence waypoints, compare Safest, Fastest, and Direct traverse strategies, "
            "and examine elevation profiles with climb and descent statistics. "
            "Routes can be verified against DTM coverage and exported to GPX and GeoJSON."
        ),
    },
    {
        "id": "scene09_survival_simulator",
        "title": "Astronaut Survival Simulator",
        "text": (
            "The Astronaut Survival Simulator implements hourly numerical integration based on NASA Baseline Values for Exploration. "
            "It tracks five essential consumables: oxygen, water, battery energy, carbon dioxide scrubber capacity, and food rations. "
            "Planners test contingency scenarios, including dust storm mobility delays and scrubber degradation. "
            "The depletion timeline monitors safety margins against a twenty-percent emergency reserve, "
            "alerting operators before critical breaches occur."
        ),
    },
    {
        "id": "scene10_assessment_and_vault",
        "title": "Mission Assessment, Monte Carlo & Vault",
        "text": (
            "Finally, the Mission Assessment engine synthesizes all data into an objective feasibility score and verdict. "
            "A seven-category scorecard evaluates terrain safety, consumable margins, return logistics, and scientific return. "
            "Our five-hundred-run Monte Carlo simulation models stochastic environmental risks, verifying NASA Category One human-rating compliance. "
            "Planners can save their complete flight plan to the persistent SQLite Vault, "
            "and generate a publication-quality NASA mission feasibility PDF report with a single click. "
            "This is MARSENSE: planetary science, survival intelligence, and mission success for human exploration of Mars."
        ),
    },
]

async def generate_speech():
    os.makedirs("video/audio", exist_ok=True)
    manifest = []
    
    for scene in SCENES:
        audio_path = f"video/audio/{scene['id']}.mp3"
        print(f"Generating audio for {scene['id']}...")
        communicate = edge_tts.Communicate(scene["text"], VOICE, rate="+3%")
        await communicate.save(audio_path)
        
        # Measure duration with ffprobe
        cmd = [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", audio_path
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        duration = float(res.stdout.strip())
        print(f"  -> {scene['id']}: {duration:.2f} seconds")
        
        manifest.append({
            "id": scene["id"],
            "title": scene["title"],
            "audio_path": audio_path,
            "duration": duration,
            "text": scene["text"],
        })
        
    with open("video/manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    print("\nAll audio narration generated successfully! Manifest saved to video/manifest.json.")

if __name__ == "__main__":
    asyncio.run(generate_speech())
