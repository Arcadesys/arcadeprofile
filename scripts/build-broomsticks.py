"""Build the gift through Heinlein with the original Estelle's Children layout.

The vendored YAML is an exact copy of the final-assets configuration. Only
edition metadata, manuscript/cover and output paths are adapted. Heinlein's
templates, geometry and typography remain the original design. The installed
pipeline has no smart-punctuation option, so this process-local adapter disables
it for both conversion entry points; no Heinlein or archive file is changed.
"""
from __future__ import annotations

import argparse
import hashlib
from pathlib import Path
import shutil
import subprocess
import tempfile

import yaml
from heinlein import pandoc
from heinlein.cli import main as heinlein_main


ROOT = Path(__file__).resolve().parent.parent
SOURCE_SHA = "a120180eb693201efa511abad57637036e0562393955a6bdad9764164ff02b92"
LAYOUT_SHA = "2154755f3cdab939dbd4c2988805fab3dd7da17b07f57edb4746dd261fb484ad"
NOTE = "The opening story of Estelle's Children, forthcoming from Free Play Publishing."
SITE = "https://www.thearcades.me/novels/estelles-children"


def literal_html(body_md: str) -> str:
    return subprocess.run(
        [pandoc.pandoc_path(), "-f", "markdown-smart", "-t", "html5", "--no-highlight"],
        input=body_md, text=True, capture_output=True, check=True,
    ).stdout


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--epub-only", action="store_true")
    parser.add_argument("--debug-dir", type=Path)
    args = parser.parse_args()
    source = ROOT / "data/subscriber-gifts/broomsticks.md"
    layout = ROOT / "data/subscriber-gifts/estelles-children-layout.yaml"
    original = source.read_bytes()
    if hashlib.sha256(original).hexdigest() != SOURCE_SHA:
        raise ValueError("Canonical Broomsticks source changed; review before rebuilding.")
    if hashlib.sha256(layout.read_bytes()).hexdigest() != LAYOUT_SHA:
        raise ValueError("Original final-assets layout configuration changed.")

    # Keep straight quotes, existing em dashes, ellipses and attribution markers.
    original_run = pandoc.run

    def literal_run(arguments: list[str], *, input_bytes: bytes | None = None) -> None:
        original_run([
            "markdown-smart" if value == "markdown" and index > 0
            and arguments[index - 1] in ("-f", "--from") else value
            for index, value in enumerate(arguments)
        ], input_bytes=input_bytes)

    pandoc.md_to_html = literal_html
    pandoc.run = literal_run
    with tempfile.TemporaryDirectory(prefix="broomsticks-heinlein-") as directory:
        temporary = Path(directory)
        manuscript = temporary / "broomsticks.md"
        # Preserve the complete source slice inside the derived input; edition
        # information is separate end matter, outside the story section.
        manuscript.write_bytes(original + (
            "\n\n## About this edition {#about-this-edition}\n\n"
            f"{NOTE}\n\nSubscriber reading edition.\n\n"
            f"[Read more at thearcades.me]({SITE})\n"
        ).encode("utf-8"))
        cfg = yaml.safe_load(layout.read_text())
        cfg.update(manuscript=str(manuscript), cover=None, output=str(temporary / "dist"))
        cfg["metadata"].update(
            title="Broomsticks", subtitle=NOTE, publisher="Free Play Publishing",
            imprint_name="Free Play Publishing", imprint_tagline="subscriber reading edition",
            imprint_blurb="The opening story of Estelle's Children, forthcoming from Free Play Publishing.",
            imprint_url="thearcades.me", description=NOTE,
            rights="Broomsticks © 2026 Austen Tucker. All rights reserved.",
            colophon=[
                "Broomsticks © 2026 Austen Tucker. All rights reserved.", NOTE,
                "Set in Lora, Inter, and JetBrains Mono. Designed for screen and trade format.",
                SITE,
            ],
        )
        configuration = temporary / "heinlein.yaml"
        configuration.write_text(yaml.safe_dump(cfg, allow_unicode=True, sort_keys=False))
        formats = ["epub"] if args.epub_only else ["pdf", "epub"]
        command = ["build", "--config", str(configuration), "--formats", ",".join(formats)]
        if args.debug_dir:
            command.append("--debug-html")
        if heinlein_main(command) != 0:
            raise RuntimeError("Heinlein build failed.")
        output = ROOT / "public/lead-magnets"
        for extension in formats:
            destination = output / f"broomsticks.{extension}"
            shutil.copyfile(temporary / "dist" / destination.name, destination)
            print(f"{destination.relative_to(ROOT)}: {destination.stat().st_size} bytes")
        if args.debug_dir and not args.epub_only:
            args.debug_dir.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(temporary / "dist/print.html", args.debug_dir / "print.html")
    if source.read_bytes() != original:
        raise ValueError("Manuscript changed during build.")


if __name__ == "__main__":
    main()
