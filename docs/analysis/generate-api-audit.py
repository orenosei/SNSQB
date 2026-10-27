"""Regenerate only api-inventory.csv from the immutable local OpenAPI document.

Usage (from any directory):
    python3 docs/analysis/generate-api-audit.py
    python3 docs/analysis/generate-api-audit.py --check

Standard library only. No HTTP, application scaffolding, testcase generation or
source-spec changes. Existing planning/verification metadata is preserved by
operation key; test/reference CSVs supply traceability without the old Markdown.
"""
import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = ROOT / 'docs/source/openapi.json'
OUTPUT = ROOT / 'docs/analysis/api-inventory.csv'
CASES = ROOT / 'docs/testing/test-case-matrix.csv'
REFERENCES = ROOT / 'docs/testing/test-reference-data.csv'
METHODS = {'get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'}


def read_csv(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream))


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def normative(value):
    """Retain constraints/prose but avoid copying example identities/secrets."""
    if isinstance(value, dict):
        return {key: normative(item) for key, item in value.items()
                if key not in ('example', 'examples')}
    if isinstance(value, list):
        return [normative(item) for item in value]
    return value


def refs(value):
    if isinstance(value, dict):
        if '$ref' in value:
            yield value['$ref']
        for item in value.values():
            yield from refs(item)
    elif isinstance(value, list):
        for item in value:
            yield from refs(item)


def schema_closure(spec, value):
    result = {}
    pending = list(refs(value))
    while pending:
        ref = pending.pop()
        if ref in result:
            continue
        if not ref.startswith('#/components/'):
            raise ValueError(f'Unsupported local reference: {ref}')
        node = spec
        for token in ref[2:].split('/'):
            node = node[token.replace('~1', '/').replace('~0', '~')]
        result[ref] = normative(node)
        pending.extend(refs(node))
    return result


def generate(spec, previous, cases, references):
    old = {row['operation_key']: row for row in previous}
    seen_ids = set()
    for path, item in spec['paths'].items():
        for method, operation in item.items():
            if method not in METHODS:
                continue
            key = f'{method.upper()} {path}'
            oid = operation['operationId']
            if oid in seen_ids:
                raise ValueError(f'Duplicate operationId: {oid}')
            seen_ids.add(oid)
            saved = old.get(key, {})
            admin = path.startswith(('/admin/', '/auth/admin/'))
            # This specification was reviewed for additional Admin-only prose/tags;
            # none exists outside these prefixes. Never treat a Bearer role as Admin.
            security = operation.get('security', spec.get('security', []))
            auth = 'PUBLIC (security: [])' if not security else 'Bearer JWT'
            if any('bearerAuth' in requirement for requirement in security):
                auth += '; bearerAuth alias of BearerAuth assumed (PLAN.md); source unchanged'
            linked = [r for r in references if oid in r['operation_ids'].split(';')]
            historical = saved.get('historical_reference_ids', saved.get('decision_dependencies', ''))
            categories = sorted({r['category'] for r in cases
                                 if r['layer'] == 'API' and r['operation_id'] == oid})
            parameters = item.get('parameters', []) + operation.get('parameters', [])
            body = operation.get('requestBody', {})
            responses = operation.get('responses', {})
            role = saved.get('required_roles_documented', 'Theo description/tag/403; Bearer không xác định role.')
            role = role.replace('Cần chốt object scope.', 'Không suy thêm quyền ngoài Swagger.')
            role = role.replace('Chưa chốt scope lớp/môn.', 'Kiểm quyền lớp/môn theo Swagger và kết quả thật.')
            role = role.replace('Scope lớp cần xác nhận.', 'Kiểm scope lớp bằng tài khoản test.')
            yield dict(
                operation_key=key, http_method=method.upper(), path=path,
                complete_path='/api/v1' + path,
                absolute_url='https://snsqb.duckdns.org/api/v1' + path,
                operation_id=oid, summary=operation.get('summary', ''),
                description=operation.get('description', ''),
                tags=compact(operation.get('tags', [])), authentication=auth,
                effective_security=compact(security), required_roles_documented=role,
                role_evidence=operation.get('description', '') + ' | ' + responses.get('403', {}).get('description', ''),
                parameters=compact(normative(parameters)), request_body=compact(normative(body)),
                responses=compact(normative(responses)),
                schema_closure=compact(schema_closure(spec, [body, responses, parameters])),
                documented_status_codes=';'.join(responses), admin_only='YES' if admin else 'NO',
                admin_reason='Excluded by user: /admin/** or /auth/admin/**' if admin else 'Non-Admin theo đặc tả đã rà soát',
                potentially_destructive=saved.get('potentially_destructive', 'YES' if method == 'delete' else 'REVIEW'),
                state_change=saved.get('state_change', 'NO_DOCUMENTED' if method == 'get' else 'YES'),
                side_effect_note=saved.get('side_effect_note', 'Theo method và description; chưa kiểm chứng runtime'),
                frontend_feature=saved.get('frontend_feature', ''),
                recommended_test_categories='EXCLUDED_NO_REQUEST' if admin else ';'.join(categories),
                implementation_priority=saved.get('implementation_priority', 'EXCLUDED_ADMIN' if admin else 'TODO'),
                phase=saved.get('phase', '0' if admin else ''),
                requirement_ids=saved.get('requirement_ids', ';'.join(r['reference_id'] for r in linked)),
                historical_reference_ids=historical,
                verification_status=saved.get('verification_status', 'NOT_CALLED_NOT_VERIFIED'),
            )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Compare inventory with source without writing')
    args = parser.parse_args()
    spec = json.loads(SPEC.read_text())
    previous = read_csv(OUTPUT) if OUTPUT.exists() else []
    rows = list(generate(spec, previous, read_csv(CASES), read_csv(REFERENCES)))
    if args.check:
        if rows != previous:
            raise SystemExit('Inventory is stale; run the generator without --check.')
        action = 'CHECK_OK'
    else:
        with OUTPUT.open('w', encoding='utf-8-sig', newline='') as stream:
            writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)
        action = 'GENERATED'
    allowed = sum(row['admin_only'] == 'NO' for row in rows)
    print(f'{action}: {len(rows)} operations; {allowed} non-Admin; {len(rows)-allowed} excluded. Offline only.')


if __name__ == '__main__':
    main()
