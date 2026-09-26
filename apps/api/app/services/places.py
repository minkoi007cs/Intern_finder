"""US city lookup for profile locations — offline, no third-party geocoder.

Data: GeoNames cities with population >= 15,000 (CC BY 4.0), bundled in app/data/us_cities.json.
Nothing a student types leaves this server.
"""

from __future__ import annotations

import json
import unicodedata
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "us_cities.json"
ATTRIBUTION = "City data © GeoNames (geonames.org), CC BY 4.0"


@dataclass(frozen=True)
class Place:
    city: str
    state: str
    latitude: float
    longitude: float
    population: int

    @property
    def label(self) -> str:
        return f"{self.city}, {self.state}"


def _norm(text: str) -> str:
    folded = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    return " ".join(folded.lower().replace(".", "").split())


@lru_cache
def _data() -> tuple[tuple[Place, ...], dict[str, str]]:
    raw = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    places = tuple(Place(city, state, lat, lon, pop) for city, state, lat, lon, pop in raw["cities"])
    states: dict[str, str] = {}
    for code, name in raw["states"].items():
        states[_norm(code)] = code
        states[_norm(name)] = code
    return places, states


def _split(query: str) -> tuple[str, str | None]:
    city, _, state = query.partition(",")
    return _norm(city), (_norm(state) or None)


def _state_code(text: str | None) -> str | None:
    if text is None:
        return None
    return _data()[1].get(text)


def search(query: str, limit: int = 8) -> list[Place]:
    """Cities whose name starts with the query (and state, after a comma); exact names first, then by size."""
    city, state_text = _split(query)
    if len(city) < 2:
        return []
    places, states = _data()
    state_codes: set[str] | None = None
    if state_text is not None:
        state_codes = {code for key, code in states.items() if key.startswith(state_text)}
        if not state_codes:
            return []
    hits = [
        place for place in places
        if _norm(place.city).startswith(city) and (state_codes is None or place.state in state_codes)
    ]
    hits.sort(key=lambda place: (_norm(place.city) != city, -place.population))
    return hits[:limit]


def resolve(label: str | None) -> Place | None:
    """The one city a label like "Kent, OH" or "Kent, Ohio" names. No state → None (Kent WA ≠ Kent OH)."""
    if not label:
        return None
    city, state_text = _split(label)
    code = _state_code(state_text)
    if code is None:
        return None
    places, _ = _data()
    for place in places:
        if place.state == code and _norm(place.city) == city:
            return place
    return None
