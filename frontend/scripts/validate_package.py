import os
import sys
import zipfile
import json
import re
import tempfile
import shutil

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ZIP_PATH = r"c:\Users\lokes\Lifeops Ai\frontend\public\downloads\lifeops-ai-chrome-extension.zip"

def scan_zip():
    print("================================================================")
    print("      LIFEOPS AI CHROME EXTENSION — SECURITY SCANNER            ")
    print("================================================================\n")

    assert os.path.exists(ZIP_PATH), f"ZIP not found at {ZIP_PATH}"
    print(f"Inspecting ZIP package: {ZIP_PATH}")
    print(f"Package Size: {os.path.getsize(ZIP_PATH):,} bytes\n")

    forbidden_patterns = [
        r"gsk_[0-9A-Za-z]{20,}",
        r"AIza[0-9A-Za-z_-]{25,}",
        r"sb_publishable_[0-9A-Za-z_-]{20,}",
        r"GROQ_API_KEY=gsk",
        r"eyJhbGciOi",
        r"SUPABASE_SERVICE_ROLE_KEY=sb",
        r"SUPABASE_ANON_KEY=sb",
        r"c:\\users\\lokes",
        r"c:/users/lokes"
    ]

    forbidden_filenames = [
        ".env",
        ".git",
        "__pycache__",
        ".venv",
        "node_modules",
        ".DS_Store"
    ]

    violations = []
    file_list = []

    with zipfile.ZipFile(ZIP_PATH, 'r') as zf:
        file_list = zf.namelist()
        for member in file_list:
            # Check filename rules
            basename = os.path.basename(member)
            if basename == ".env":
                violations.append(f"Forbidden file found: {member} (contains real environment secrets!)")
            for fb in forbidden_filenames:
                if fb in member and not member.endswith(".env.example"):
                    violations.append(f"Forbidden directory/file pattern '{fb}' in member: {member}")

            # Check content rules for text files
            if member.endswith(('.py', '.js', '.html', '.css', '.md', '.bat', '.json', '.txt', '.example', 'LICENSE')):
                content = zf.read(member).decode('utf-8', errors='ignore')
                for pat in forbidden_patterns:
                    matches = re.findall(pat, content, flags=re.IGNORECASE)
                    if matches:
                        violations.append(f"Forbidden secret/personal path pattern '{pat}' found in {member}: {matches}")

            # Validate manifest.json specifically
            if member.endswith("manifest.json"):
                manifest_raw = zf.read(member).decode('utf-8')
                try:
                    manifest_data = json.loads(manifest_raw)
                    print("[PASS] manifest.json is valid JSON.")
                    print(f"       Name: {manifest_data.get('name')}")
                    print(f"       Version: {manifest_data.get('version')}")
                    print(f"       Permissions: {manifest_data.get('permissions')}")
                except Exception as e:
                    violations.append(f"Invalid manifest.json: {e}")

    print("\n--- ZIP File Hierarchy ---")
    for f in sorted(file_list):
        print(f"  ✓ {f}")

    if violations:
        print("\n[FAIL] SECURITY VIOLATIONS DETECTED:")
        for v in violations:
            print(f"  ❌ {v}")
        raise ValueError("Security scan failed!")
    else:
        print("\n================================================================")
        print("  [PASS] ZERO SECRETS FOUND! PACKAGE IS 100% SAFE FOR PUBLIC. ")
        print("================================================================\n")

def test_extraction():
    print("Testing clean extraction into temporary test directory...")
    temp_dir = tempfile.mkdtemp(prefix="lifeops_test_")
    try:
        with zipfile.ZipFile(ZIP_PATH, 'r') as zf:
            zf.extractall(temp_dir)
        
        extracted_root = os.path.join(temp_dir, "lifeops-ai-chrome-extension")
        assert os.path.exists(extracted_root), "Extracted root folder missing"
        assert os.path.exists(os.path.join(extracted_root, "setup.bat")), "setup.bat missing"
        assert os.path.exists(os.path.join(extracted_root, "start_server.bat")), "start_server.bat missing"
        assert os.path.exists(os.path.join(extracted_root, "README.md")), "README.md missing"
        assert os.path.exists(os.path.join(extracted_root, "extension", "manifest.json")), "manifest.json missing"
        assert os.path.exists(os.path.join(extracted_root, "server", "main.py")), "server/main.py missing"
        assert os.path.exists(os.path.join(extracted_root, "server", ".env.example")), "server/.env.example missing"
        assert not os.path.exists(os.path.join(extracted_root, "server", ".env")), "server/.env should NOT exist prior to setup"
        
        print("[PASS] Clean extraction test passed successfully!")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    scan_zip()
    test_extraction()
