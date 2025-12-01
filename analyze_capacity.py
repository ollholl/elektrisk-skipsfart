import json

# Load BKK data as example
d = json.load(open('data/grid/bkk.json'))
if isinstance(d, list): d = d[0]

print("=== Eksempel på data ===")
for f in d['features'][:8]:
    p = f['properties']
    print(f"{p['name']}: availableCons={p.get('availableCons')}, availableProd={p.get('availableProd')}, reservedCons={p.get('reservedCons')}")

print("\n=== Beskrivelse fra data ===")
print(d['features'][0]['properties'].get('shortDescription', 'Ingen beskrivelse'))

print("\n=== Statistikk på availableProd ===")
all_prod = [f['properties'].get('availableProd', 0) for f in d['features']]
print(f"Antall positive: {sum(1 for x in all_prod if x > 0)}")
print(f"Antall negative: {sum(1 for x in all_prod if x < 0)}")
print(f"Antall null: {sum(1 for x in all_prod if x == 0)}")
print(f"Min: {min(all_prod)}, Max: {max(all_prod)}")

