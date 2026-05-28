#!/usr/bin/env python3
import json
import os
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SPEC = ROOT / "openapi" / "public.json"
SPEC_PATH = Path(os.environ.get("CRAWLORA_OPENAPI_SPEC", DEFAULT_SPEC))
TAG_GROUP_OVERRIDES = {
    "AppStore": "appStore",
    "CoinGecko": "coinGecko",
    "GooglePlay": "googlePlay",
    "ProductHunt": "productHunt",
    "SimilarWeb": "similarWeb",
    "SpotifyPodcasts": "spotifyPodcasts",
    "TikTok": "tiktok",
    "YouTube": "youtube",
}
TAG_PREFIX_OVERRIDES = {
    "AppStore": "appstore",
    "CoinGecko": "coingecko",
    "GooglePlay": "googleplay",
    "ProductHunt": "producthunt",
    "SimilarWeb": "similarweb",
    "SpotifyPodcasts": "spotify-podcasts",
    "TikTok": "tiktok",
    "YouTube": "youtube",
}


def words(value):
    value = re.sub(r"([a-z0-9])([A-Z])", r"\1-\2", value)
    return [part for part in re.split(r"[^A-Za-z0-9]+", value.lower()) if part]


def camel(parts):
    if not parts:
        return "call"
    return parts[0] + "".join(part[:1].upper() + part[1:] for part in parts[1:])


def alias(operation_id, tag, used):
    op_words = words(operation_id)
    tag_words = words(TAG_PREFIX_OVERRIDES.get(tag, tag))
    if op_words[: len(tag_words)] == tag_words:
        op_words = op_words[len(tag_words) :]
    name = camel(op_words)
    if not name or name in used:
        name = camel(words(operation_id))
    base = name
    i = 2
    while name in used:
        name = f"{base}{i}"
        i += 1
    used.add(name)
    return name


def md_escape(value):
    return str(value).replace("|", "\\|").replace("\n", " ")


def md_code(value):
    return f"`{md_escape(value)}`"


def operation_definition(operation_id, method, path, operation):
    params = operation.get("parameters", [])
    security = []
    for requirement in operation.get("security", []):
        security.extend(requirement.keys())
    return {
        "id": operation_id,
        "method": method.upper(),
        "path": path,
        "pathParams": [p["name"] for p in params if p.get("in") == "path"],
        "queryParams": [
            {
                "name": p["name"],
                "in": "query",
                **({"collectionFormat": p["collectionFormat"]} if "collectionFormat" in p else {}),
                **({"type": p["type"]} if "type" in p else {}),
                **({"required": True} if p.get("required") else {}),
                **({"enum": enum_values(p)} if enum_values(p) else {}),
            }
            for p in params
            if p.get("in") == "query"
        ],
        "formParams": [
            {
                "name": p["name"],
                "in": "formData",
                **({"type": p["type"]} if "type" in p else {}),
                **({"required": True} if p.get("required") else {}),
                **({"enum": enum_values(p)} if enum_values(p) else {}),
            }
            for p in params
            if p.get("in") == "formData"
        ],
        "bodyParam": next((p["name"] for p in params if p.get("in") == "body"), None),
        "bodyRequired": any(p.get("in") == "body" and p.get("required") for p in params),
        "consumes": operation.get("consumes", []),
        "produces": operation.get("produces", []),
        "security": security,
    }


def enum_values(param):
    return [str(value) for value in (param.get("enum") or param.get("items", {}).get("enum") or [])]


def type_name(*parts):
    raw = "".join(part[:1].upper() + part[1:] for part in words("-".join(parts)))
    return raw or "Operation"


def param_doc(params):
    if not params:
        return "none"
    entries = []
    for param in params:
        required = " required" if param.get("required") else ""
        location = param.get("in", "param")
        entries.append(f"{md_code(param['name'])} ({location} {md_escape(ts_type(param))}{required})")
    return "<br>".join(entries)


def auth_doc(security):
    return ", ".join(md_code(item) for item in security) if security else "none"


def operation_note(operation_id, operation):
    produces = [str(item).lower() for item in operation.get("produces", [])]
    if "text/plain" in produces or operation_id == "youtube-transcript":
        return "Supports text response mode."
    return ""


def operation_docs(grouped, operation_meta, operation_count):
    lines = [
        "# Crawlora JavaScript SDK Operations",
        "",
        "Generated from `openapi/public.json`. Deprecated, admin, and internal operations are excluded from this SDK contract.",
        "",
        f"Total operations: `{operation_count}`",
        "",
        "| Group | SDK method | Operation ID | HTTP | Params | Auth | Response | Notes |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for group_name, methods in grouped.items():
        for method_name, operation_id in methods.items():
            meta = operation_meta[operation_id]
            lines.append(
                "| "
                + " | ".join(
                    [
                        md_escape(group_name),
                        md_code(f"{group_name}.{method_name}"),
                        md_code(operation_id),
                        md_code(f"{meta['method']} {meta['path']}"),
                        param_doc(meta["params"]),
                        auth_doc(meta["security"]),
                        md_code(meta["typeBase"] + "Response"),
                        md_escape(meta["note"]),
                    ]
                )
                + " |"
            )
    lines.append("")
    return "\n".join(lines)


def schema_type_name(value):
    return "Model" + type_name(value)


def schema_ref_name(schema):
    ref = (schema or {}).get("$ref", "")
    return ref.rsplit("/", 1)[-1] if ref else ""


def schema_ref_type(schema):
    ref_name = schema_ref_name(schema)
    return schema_type_name(ref_name) if ref_name else ""


def ts_schema_type(schema):
    if not schema:
        return "unknown"
    if "$ref" in schema:
        return schema_ref_type(schema)
    if "allOf" in schema:
        parts = [ts_schema_type(part) for part in schema.get("allOf", [])]
        concrete = [part for part in parts if part != "unknown"]
        return " & ".join(concrete) if concrete else "unknown"
    enum_schema_values = schema.get("enum") or []
    if enum_schema_values:
        return " | ".join(json.dumps(str(value)) for value in enum_schema_values)
    typ = schema.get("type")
    if typ in {"integer", "number"}:
        return "number"
    if typ == "boolean":
        return "boolean"
    if typ == "string":
        return "string"
    if typ == "array":
        return f"Array<{ts_schema_type(schema.get('items', {'type': 'string'}))}>"
    if typ == "object":
        if schema.get("properties"):
            required = set(schema.get("required") or [])
            props = []
            for name, prop_schema in sorted(schema.get("properties", {}).items()):
                optional = "" if name in required else "?"
                props.append(f"{json.dumps(name)}{optional}: {ts_schema_type(prop_schema)}")
            return "{ " + "; ".join(props) + " }"
        additional = schema.get("additionalProperties")
        if additional:
            value_type = ts_schema_type(additional) if isinstance(additional, dict) else "unknown"
            return f"Record<string, {value_type}>"
        return "Record<string, unknown>"
    return "unknown"


def ts_type(param):
    enum_values = param.get("enum") or []
    if enum_values:
        return " | ".join(json.dumps(str(value)) for value in enum_values)
    typ = param.get("type")
    if typ in {"integer", "number"}:
        return "number"
    if typ == "boolean":
        return "boolean"
    if typ == "array":
        item = ts_type(param.get("items", {"type": "string"}))
        return f"Array<{item}>"
    if typ == "file":
        return "unknown"
    return "string"


def type_property(name, typ, required):
    optional = "" if required else "?"
    return f"  {json.dumps(name)}{optional}: {typ};"


def type_declarations(grouped, operation_meta):
    lines = [
        "// Generated by scripts/generate.py. Do not edit manually.",
        "",
        "export type CrawloraResponse<T = unknown> = T;",
        "export type CrawloraBody<T = Record<string, unknown>> = T;",
        "",
    ]
    for schema_name, schema in operation_meta["definitions"].items():
        model_name = schema_type_name(schema_name)
        if schema.get("type") == "object" and schema.get("properties"):
            required = set(schema.get("required") or [])
            lines.append(f"export interface {model_name} {{")
            for prop_name, prop_schema in sorted(schema.get("properties", {}).items()):
                optional = "" if prop_name in required else "?"
                lines.append(f"  {json.dumps(prop_name)}{optional}: {ts_schema_type(prop_schema)};")
            lines.append("}")
            lines.append("")
            continue
        lines.append(f"export type {model_name} = {ts_schema_type(schema)};")
        lines.append("")
    for operation_id, meta in operation_meta.items():
        if operation_id == "definitions":
            continue
        base = meta["typeBase"]
        body_type = meta["bodyType"]
        response_type = meta["responseType"]
        if body_type != "unknown":
            lines.append(f"export type {base}Body = CrawloraBody<{body_type}>;")
        lines.append(f"export type {base}Response = CrawloraResponse<{response_type}>;")
        lines.append(f"export interface {base}Params {{")
        for param in meta["params"]:
            if param["in"] == "body":
                typ = f"{base}Body"
            else:
                typ = ts_type(param)
            lines.append(type_property(param["name"], typ, bool(param.get("required"))))
        lines.append("}")
        lines.append("")
    for group_name, methods in grouped.items():
        lines.append(f"export interface {type_name(group_name, 'service')} {{")
        for method_name, operation_id in methods.items():
            meta = operation_meta[operation_id]
            param_optional = "?" if not meta["hasRequiredParams"] else ""
            lines.append(
                f"  {method_name}<T = {meta['typeBase']}Response>("
                f"params{param_optional}: {meta['typeBase']}Params, "
                "options?: import('./index.js').CrawloraRequestOptions"
                "): Promise<T>;"
            )
        lines.append("}")
        lines.append("")
    lines.append("export interface CrawloraGeneratedGroups {")
    for group_name in grouped:
        lines.append(f"  {group_name}: {type_name(group_name, 'service')};")
    lines.append("}")
    lines.append("")
    operation_ids = [operation_id for operation_id in operation_meta if operation_id != "definitions"]
    lines.append("export interface OperationParamsMap {")
    for operation_id in operation_ids:
        lines.append(f"  {json.dumps(operation_id)}: {operation_meta[operation_id]['typeBase']}Params;")
    lines.append("}")
    lines.append("")
    lines.append("export interface OperationResponseMap {")
    for operation_id in operation_ids:
        lines.append(f"  {json.dumps(operation_id)}: {operation_meta[operation_id]['typeBase']}Response;")
    lines.append("}")
    lines.append("")
    lines.append("export interface OperationRequiredParamsMap {")
    for operation_id in operation_ids:
        required = "true" if operation_meta[operation_id]["hasRequiredParams"] else "false"
        lines.append(f"  {json.dumps(operation_id)}: {required};")
    lines.append("}")
    lines.append("")
    lines.append("export type OperationId = keyof OperationParamsMap;")
    lines.append("")
    lines.append("export type OperationRequestArgs<I extends OperationId> =")
    lines.append("  OperationRequiredParamsMap[I] extends true")
    lines.append("    ? [params: OperationParamsMap[I], options?: import('./index.js').CrawloraRequestOptions]")
    lines.append("    : [params?: OperationParamsMap[I], options?: import('./index.js').CrawloraRequestOptions];")
    lines.append("")
    lines.append("export type OperationIdLiteral =")
    for operation_id in operation_ids:
        lines.append(f"  | {json.dumps(operation_id)}")
    lines[-1] += ";"
    lines.append("")
    return "\n".join(lines)


def main():
    if not SPEC_PATH.exists():
        raise SystemExit(f"public OpenAPI spec not found: {SPEC_PATH}")
    spec = json.loads(SPEC_PATH.read_text())
    (ROOT / "openapi").mkdir(exist_ok=True)
    target_spec = ROOT / "openapi" / "public.json"
    if SPEC_PATH.resolve() != target_spec.resolve():
        shutil.copyfile(SPEC_PATH, target_spec)

    operations = {}
    grouped = {}
    operation_meta = {}
    used_by_group = {}
    for path, methods in sorted(spec["paths"].items()):
        for method, operation in sorted(methods.items()):
            operation_id = operation["operationId"]
            tag = (operation.get("tags") or ["default"])[0]
            group_name = TAG_GROUP_OVERRIDES.get(tag, camel(words(tag)))
            grouped.setdefault(group_name, {})
            used_by_group.setdefault(group_name, set())
            method_name = alias(operation_id, tag, used_by_group[group_name])
            operations[operation_id] = operation_definition(operation_id, method, path, operation)
            grouped[group_name][method_name] = operation_id
            params = operation.get("parameters", [])
            body_schema = next((p.get("schema") for p in params if p.get("in") == "body"), None)
            response_schema = operation.get("responses", {}).get("200", {}).get("schema")
            typed_params = [p for p in params if p.get("in") in {"path", "query", "formData", "body"}]
            operation_meta[operation_id] = {
                "typeBase": type_name(group_name, method_name),
                "method": method.upper(),
                "path": path,
                "params": typed_params,
                "bodyType": ts_schema_type(body_schema),
                "responseType": ts_schema_type(response_schema),
                "hasRequiredParams": any(p.get("required") for p in typed_params),
                "security": [key for req in operation.get("security", []) for key in req.keys()],
                "note": operation_note(operation_id, operation),
            }
    operation_meta["definitions"] = spec.get("definitions", {})

    content = (
        "// Generated by scripts/generate.py. Do not edit manually.\n"
        f"export const operations = {json.dumps(operations, indent=2, sort_keys=True)};\n\n"
        f"export const groups = {json.dumps(grouped, indent=2, sort_keys=True)};\n\n"
        f"export const operationCount = {sum(len(methods) for methods in spec['paths'].values())};\n"
    )
    (ROOT / "src" / "operations.js").write_text(content)
    (ROOT / "src" / "types.d.ts").write_text(type_declarations(grouped, operation_meta))
    (ROOT / "docs").mkdir(exist_ok=True)
    (ROOT / "docs" / "operations.md").write_text(
        operation_docs(grouped, operation_meta, sum(len(methods) for methods in spec["paths"].values()))
    )


if __name__ == "__main__":
    main()
