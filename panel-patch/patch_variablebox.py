#!/usr/bin/env python3
from pathlib import Path
import sys

if len(sys.argv) != 2:
    print("Usage: patch_variablebox.py /path/to/VariableBox.tsx")
    raise SystemExit(2)

path = Path(sys.argv[1])
if not path.is_file():
    print(f"ERROR: file not found: {path}")
    raise SystemExit(1)

text = path.read_text(encoding="utf-8")

IMPORT_LINE = "import DynamicProfileSelect from '@/components/server/startup/DynamicProfileSelect';"
if IMPORT_LINE not in text:
    anchor = "import { ServerContext } from '@/state/server';"
    if anchor not in text:
        print("ERROR: Could not find ServerContext import anchor. Panel source differs from supported layout.")
        raise SystemExit(1)
    text = text.replace(anchor, anchor + "\n" + IMPORT_LINE, 1)

branch_anchor = "{selectValues.length > 0 ? ("
replacement = """{variable.envVariable === 'SERVER_PROFILE' ? (
                            <DynamicProfileSelect
                                variable={variable}
                                disabled={!canEdit || !variable.isEditable}
                                onChange={setVariableValue}
                            />
                        ) : selectValues.length > 0 ? ("""

if "variable.envVariable === 'SERVER_PROFILE'" not in text:
    if branch_anchor not in text:
        print("ERROR: Could not find startup select branch anchor. Panel source differs from supported layout.")
        raise SystemExit(1)
    text = text.replace(branch_anchor, replacement, 1)

path.write_text(text, encoding="utf-8")
print(f"Patched: {path}")
