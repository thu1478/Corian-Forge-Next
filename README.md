# READ ME

## Documentation

Architecture, data model, contributor workflows, and the cleanup roadmap live in [`docs/`](./docs/README.md).

| Doc | Description |
|-----|-------------|
| [docs/README.md](./docs/README.md) | Documentation index |
| [docs/architecture-overview.md](./docs/architecture-overview.md) | App structure, hydration, layering |
| [docs/data-model.md](./docs/data-model.md) | Save schema and rules topology |
| [docs/contributor-guide.md](./docs/contributor-guide.md) | How to add features |
| [docs/rules-json-authoring.md](./docs/rules-json-authoring.md) | `rules.json` field reference |
| [docs/folder-structure.md](./docs/folder-structure.md) | Code placement rules |
| [docs/testing.md](./docs/testing.md) | Test commands |

## NPM Commands
### Build project
```npm run build```
### Start dev environment
```npm run dev```
### Run build and dev env
```npm run build-and-dev```
### Start
```npm run start```

## TODO List
### Structure
- [] Split data loading into one-time load and user-input refresh
### UI
- [ ] Split character into Features (skills, traits, etc) and Character (background)
### Character Data
- [ ] Add flags for optional content like ammo and weight
### Equipment
- [X] Make equipment usable
- [ ] Equipment containers
- [ ] Make equipment draggable within inventory menu
- [ ] Make equipment capable of having stat and skill bonuses
### Classes
- [ ] Add class prereqs to equipment
### Races
- [ ] Create races
### Action Cards
- [ ] Create action cards