# Automation File Input And Output

## File Output

Python execution returns wrapper JSON through stdout or the output file:

```jsonc
{ "artifact": { "summary": "ready" } }
```

Generated files belong under `DAIMON_BLUEPRINT_AUTOMATION_RUN_DIRECTORY`. Return file descriptors alongside the artifact:

```jsonc
{
  "artifact": { "summary": "Report ready" },
  "files": [
    {
      "sourcePath": "/absolute/run-directory/report.pdf",
      "name": "report.pdf",
      "mimeType": "application/pdf"
    }
  ]
}
```

Each generated file descriptor supports only:

```ts
{ sourcePath: string; name?: string; mimeType?: string; maxBytes?: number }
```

- `sourcePath` must resolve inside the current run directory.
- `maxBytes` is a read limit, not file-size metadata.
- Do not add `fileId`, `sizeBytes`, bytes, base64, or arbitrary metadata to a generated descriptor.
- Automation registers generated descriptors as `automation-output` `FileResourceRef` values in `run.files`.
- Artifact JSON and `run.files` are stored separately. Artifact fields are not mutated to insert file ids.

## File Input

Automation input can contain `FileResourceRef` values selected by a Widget. Treat them as references.

Background Agents use the injected `AutomationResources` tool:

- `listInputFiles`, `readText`, and `readBytes` inspect submitted refs.
- `localPath` materializes an input into the current run workspace only.
- `registerOutputFile` registers a run-local result and returns a `FileResourceRef`.
- Pass registered refs in the single final `AutomationOutput({ artifact, files })` call.

Python receives materialized resources on `ctx["resources"]` (and the same JSON through `DAIMON_BLUEPRINT_AUTOMATION_RESOURCES_CONTEXT_FILE`):

```py
input_file = ctx["input"]["inputFile"]
local_path = next(
    entry["localPath"]
    for entry in ctx["resources"].get("files", [])
    if (entry.get("file") or {}).get("fileId") == input_file["fileId"]
)
```

Match `entry.file.fileId`; the local materialized path is runtime-only. Persist and deliver `FileResourceRef`, never browser `File`, local paths, `sourcePath`, raw bytes, whole-file text, or large base64 inside artifact JSON or notifications. Python outputs must stay under the run directory; background Agent outputs must be registered with `AutomationResources.registerOutputFile`.
