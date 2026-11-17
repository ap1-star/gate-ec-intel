# Score Line public data handoff

Acquired: 2026-11-16T14:02:34.131Z
Origin: https://score-line.pages.dev

The user explicitly identified this as their website and authorized import. No standalone project/data reuse license or upstream repository was linked from the inspected public pages. Preserve Score Line attribution and every original evidence URL. Third-party application code was acquired only for schema inspection, not for incorporation into the terminal application.

## Rules

- Missing/null means unreported; do not fill from another branch, institute, year, programme or source.
- CCMT values are GATE scores, not ranks. IIT/own admission rows explicitly carry type: score/rank/marks/etc. Stage is independently retained.
- Keep conflicting source rows distinct; exact duplicate removal must preserve references.
- Company offers may repeat across RTI/report/video documents. Do not sum document totals without source-aware reconciliation.
- BITS is aggregate candidate-reported, not official closing cutoffs or admission probabilities. No respondent names were acquired.
- YouTube comments have author handles/freeform text. Publish only factual extracted fields and source references; omit author/text unless necessary and appropriately reviewed.
- Source classification is the upstream label, not independent verification.

## Document links

`source.f` resolves to `https://score-line.pages.dev/files/` plus its individually URL-encoded path segments; optional `#page=source.p`. Keep official `source.u` as a second provenance link when available. YouTube `yt`/`t` resolves to the original video and timestamp. GATE row page references cite `/files/gate_reports/GATE_{year}_report.pdf#page={p}`. No source PDFs were downloaded.

## Acquired datasets

### search

File: `raw/data/search.json` (2,102,490 bytes)
URL: https://score-line.pages.dev/data/search.json
SHA256: `71b14daf74f2a979fb3cedf94e884e43b401e5a018c2332c4f8f2ca7db398ee1`

Structure:
```json
{
  "v": {
    "kind": "int"
  },
  "items": {
    "kind": "array",
    "rows": 7260,
    "itemType": "packed_row",
    "width": 7
  }
}
```

### hero

File: `raw/data/hero.json` (298,329 bytes)
URL: https://score-line.pages.dev/data/hero.json
SHA256: `06309080cb6b44541eda180fae5f15f87dde5b680a2da187ad5c2135eee24a34`

Structure:
```json
{
  "year": {
    "kind": "int"
  },
  "families": {
    "kind": "array",
    "rows": 12,
    "itemType": "packed_row",
    "width": 2
  },
  "inst": {
    "kind": "array",
    "rows": 112,
    "itemType": "dict",
    "fields": [
      "name",
      "code",
      "type"
    ]
  },
  "prog": {
    "kind": "array",
    "rows": 2237,
    "itemType": "str"
  },
  "cats": {
    "kind": "object",
    "keys": [
      "EWS",
      "OPEN",
      "SC",
      "ST",
      "OBC-NCL"
    ]
  },
  "src": {
    "kind": "object",
    "keys": [
      "k",
      "l"
    ]
  }
}
```

### options

File: `raw/data/options.json` (1,515,218 bytes)
URL: https://score-line.pages.dev/data/options.json
SHA256: `c1ce5085eb6fae389b9b3f76b0729ae197ae5bc48809ab51719ecdf59679ba4d`

Packed row columns: `["route", "inst", "prog", "fam", "year", "cut", "cutLabel", "low", "lowRound", "history", "src", "pay", "companies"]`

Structure:
```json
{
  "cols": {
    "kind": "array",
    "rows": 13,
    "itemType": "str"
  },
  "payCols": {
    "kind": "array",
    "rows": 8,
    "itemType": "str"
  },
  "families": {
    "kind": "array",
    "rows": 12,
    "itemType": "packed_row",
    "width": 2
  },
  "inst": {
    "kind": "array",
    "rows": 112,
    "itemType": "dict",
    "fields": [
      "name",
      "code",
      "type"
    ]
  },
  "prog": {
    "kind": "array",
    "rows": 2237,
    "itemType": "str"
  },
  "src": {
    "kind": "array",
    "rows": 1202,
    "itemType": "dict",
    "fields": [
      "k",
      "l",
      "u",
      "f"
    ]
  },
  "cats": {
    "kind": "object",
    "keys": [
      "EWS",
      "OPEN",
      "SC",
      "ST",
      "OBC-NCL"
    ]
  }
}
```

### compare

File: `raw/data/compare.json` (247,836 bytes)
URL: https://score-line.pages.dev/data/compare.json
SHA256: `4233b2e0def659c3e6125873f5ee41ae90790598fd4596e49fd53aa15b3d88ed`

Structure:
```json
{
  "families": {
    "kind": "array",
    "rows": 12,
    "itemType": "packed_row",
    "width": 2
  },
  "cats": {
    "kind": "array",
    "rows": 5,
    "itemType": "str"
  },
  "src": {
    "kind": "array",
    "rows": 43,
    "itemType": "dict",
    "fields": [
      "k",
      "u",
      "f",
      "l"
    ]
  },
  "inst": {
    "kind": "object",
    "keys": [
      "IITM",
      "IITD",
      "IITB",
      "IITK",
      "IITKGP",
      "IITR",
      "IITG",
      "IITH",
      "IITBHU",
      "IITISM",
      "IITI",
      "IITBBS",
      "IITGN",
      "IITP",
      "IITRPR",
      "IITJ",
      "IITMANDI",
      "IITTP",
      "IITPKD",
      "IITJMU"
    ]
  }
}
```

### ccmt

File: `raw/data/ccmt.json` (1,793,189 bytes)
URL: https://score-line.pages.dev/data/ccmt.json
SHA256: `d5df30d8bee0d7c2fca43417127fa6209e492a53a7edb8dbe1d7ed08f7555b64`

Packed row columns: `["year", "round", "roundOrder", "inst", "prog", "group", "cat", "max", "min", "src"]`

Structure:
```json
{
  "cols": {
    "kind": "array",
    "rows": 10,
    "itemType": "str"
  },
  "inst": {
    "kind": "array",
    "rows": 94,
    "itemType": "dict",
    "fields": [
      "name",
      "code",
      "type",
      "short"
    ]
  },
  "prog": {
    "kind": "array",
    "rows": 563,
    "itemType": "str"
  },
  "progFam": {
    "kind": "array",
    "rows": 563,
    "itemType": "int"
  },
  "families": {
    "kind": "array",
    "rows": 12,
    "itemType": "packed_row",
    "width": 2
  },
  "cat": {
    "kind": "array",
    "rows": 12,
    "itemType": "str"
  },
  "round": {
    "kind": "array",
    "rows": 6,
    "itemType": "str"
  },
  "src": {
    "kind": "array",
    "rows": 6,
    "itemType": "dict",
    "fields": [
      "k",
      "l",
      "u",
      "f"
    ]
  },
  "rows": {
    "kind": "array",
    "rows": 56065,
    "itemType": "packed_row",
    "width": 10
  }
}
```

### coap

File: `raw/data/coap.json` (1,869,819 bytes)
URL: https://score-line.pages.dev/data/coap.json
SHA256: `79cb320b3d467787deff0834989a66b5c252a98a5399f169fde47ba1237adfae`

Packed row columns: `["year", "inst", "dept", "prog", "paper", "cat", "stage", "type", "value", "max", "round", "note", "src", "fam"]`

Structure:
```json
{
  "cols": {
    "kind": "array",
    "rows": 14,
    "itemType": "str"
  },
  "families": {
    "kind": "array",
    "rows": 12,
    "itemType": "packed_row",
    "width": 2
  },
  "inst": {
    "kind": "array",
    "rows": 24,
    "itemType": "str"
  },
  "dept": {
    "kind": "array",
    "rows": 136,
    "itemType": "str"
  },
  "prog": {
    "kind": "array",
    "rows": 872,
    "itemType": "str"
  },
  "paper": {
    "kind": "array",
    "rows": 195,
    "itemType": "str"
  },
  "cat": {
    "kind": "array",
    "rows": 15,
    "itemType": "str"
  },
  "stage": {
    "kind": "array",
    "rows": 28,
    "itemType": "str"
  },
  "type": {
    "kind": "array",
    "rows": 6,
    "itemType": "str"
  },
  "note": {
    "kind": "array",
    "rows": 3055,
    "itemType": "str"
  },
  "src": {
    "kind": "array",
    "rows": 137,
    "itemType": "dict",
    "fields": [
      "k",
      "u",
      "f"
    ]
  },
  "rows": {
    "kind": "array",
    "rows": 30616,
    "itemType": "packed_row",
    "width": 14
  }
}
```

### companies

File: `raw/data/companies.json` (2,160,076 bytes)
URL: https://score-line.pages.dev/data/companies.json
SHA256: `6913e38c1f57b91754dac4d55cb0b7020d840a9f996c33a1d3966401de28d7db`

Structure:
```json
{
  "note": {
    "kind": "str"
  },
  "progs": {
    "kind": "array",
    "rows": 15,
    "itemType": "str"
  },
  "fams": {
    "kind": "array",
    "rows": 12,
    "itemType": "packed_row",
    "width": 2
  },
  "types": {
    "kind": "array",
    "rows": 6,
    "itemType": "str"
  },
  "kinds": {
    "kind": "array",
    "rows": 3,
    "itemType": "str"
  },
  "insts": {
    "kind": "array",
    "rows": 33,
    "itemType": "packed_row",
    "width": 3
  },
  "cos": {
    "kind": "array",
    "rows": 4536,
    "itemType": "packed_row",
    "width": 6
  },
  "str": {
    "kind": "array",
    "rows": 10427,
    "itemType": "str"
  },
  "src": {
    "kind": "array",
    "rows": 1068,
    "itemType": "dict",
    "fields": [
      "k",
      "yt",
      "t",
      "l"
    ]
  },
  "docs": {
    "kind": "int"
  },
  "rows": {
    "kind": "array",
    "rows": 19516,
    "itemType": "packed_row",
    "width": 17
  }
}
```

### branch

File: `raw/data/branch.json` (560,422 bytes)
URL: https://score-line.pages.dev/data/branch.json
SHA256: `161a36399eb8871738bad3da50cc19534b71ed8c04e43aa51ec43517db5c4261`

Structure:
```json
{
  "families": {
    "kind": "array",
    "rows": 12,
    "itemType": "packed_row",
    "width": 2
  },
  "src": {
    "kind": "array",
    "rows": 1268,
    "itemType": "dict",
    "fields": [
      "k",
      "l",
      "u",
      "f"
    ]
  },
  "data": {
    "kind": "object",
    "keys": [
      "cse",
      "vlsi",
      "bio",
      "ece",
      "ctrl",
      "civil",
      "mech",
      "mat",
      "other",
      "ee",
      "ai",
      "chem"
    ]
  }
}
```

### nirf

File: `raw/data/nirf.json` (279,549 bytes)
URL: https://score-line.pages.dev/data/nirf.json
SHA256: `b76437d99a11658e99ad296f01f8f9a66b335afb7428b8e1716c886d0ed83a0f`

Packed row columns: `["inst", "edition", "level", "admYear", "gradYear", "intake", "admitted", "lateral", "graduating", "placed", "pct", "medianLpa", "higher", "src", "latest"]`

Structure:
```json
{
  "cols": {
    "kind": "array",
    "rows": 15,
    "itemType": "str"
  },
  "src": {
    "kind": "array",
    "rows": 395,
    "itemType": "dict",
    "fields": [
      "k",
      "l",
      "f"
    ]
  },
  "rows": {
    "kind": "array",
    "rows": 2986,
    "itemType": "packed_row",
    "width": 15
  }
}
```

### youtube

File: `raw/data/youtube.json` (2,234,465 bytes)
URL: https://score-line.pages.dev/data/youtube.json
SHA256: `07710f3bb9a9eb715899cf756191143b209e41558f37c9b94e109f20370c4ca4`

Packed row columns: `["row", "video", "t", "inst", "code", "dept", "program", "season", "company", "role", "offers", "base", "ctc", "metric", "value", "notes", "shot"]`

Structure:
```json
{
  "videos": {
    "kind": "array",
    "rows": 59,
    "itemType": "dict",
    "fields": [
      "id",
      "channel",
      "title",
      "playlist",
      "inst",
      "code",
      "program",
      "season",
      "status",
      "rows",
      "comments",
      "date"
    ]
  },
  "shots": {
    "kind": "array",
    "rows": 204,
    "itemType": "dict",
    "fields": [
      "file",
      "id",
      "t",
      "inst",
      "code",
      "dept",
      "program",
      "season",
      "content",
      "rowsRef"
    ]
  },
  "cols": {
    "kind": "array",
    "rows": 17,
    "itemType": "str"
  },
  "rows": {
    "kind": "array",
    "rows": 1958,
    "itemType": "packed_row",
    "width": 17
  },
  "comments": {
    "kind": "array",
    "rows": 136,
    "itemType": "dict",
    "fields": [
      "video",
      "id",
      "author",
      "inst",
      "code",
      "program",
      "season",
      "company",
      "ctc",
      "base",
      "other",
      "text"
    ]
  },
  "companies": {
    "kind": "array",
    "rows": 4540,
    "itemType": "dict",
    "fields": [
      "name",
      "slug",
      "domain",
      "logo",
      "lw",
      "lh",
      "rows",
      "rti",
      "offers",
      "offersYt",
      "offersRti",
      "intern",
      "listed",
      "maxCtc",
      "medCtc",
      "insts",
      "seasons",
      "per"
    ]
  }
}
```

### placements

File: `raw/data/placements.json` (914,540 bytes)
URL: https://score-line.pages.dev/data/placements.json
SHA256: `5fece2b00d556cd02a987df47521d2989a6f9492b154a3dd8f4cfeb1233dac6b`

Packed row columns: `["inst", "season", "program", "dept", "spec", "registered", "eligible", "offers", "placed", "pct", "highest", "average", "median", "lowest", "companies", "ppo", "intl", "srcType", "note", "src", "fam"]`

Structure:
```json
{
  "cols": {
    "kind": "array",
    "rows": 21,
    "itemType": "str"
  },
  "families": {
    "kind": "array",
    "rows": 12,
    "itemType": "packed_row",
    "width": 2
  },
  "dept": {
    "kind": "array",
    "rows": 625,
    "itemType": "str"
  },
  "note": {
    "kind": "array",
    "rows": 850,
    "itemType": "str"
  },
  "src": {
    "kind": "array",
    "rows": 383,
    "itemType": "dict",
    "fields": [
      "k",
      "u",
      "f"
    ]
  },
  "rows": {
    "kind": "array",
    "rows": 6447,
    "itemType": "packed_row",
    "width": 21
  }
}
```

### gate

File: `raw/data/gate.json` (1,196,634 bytes)
URL: https://score-line.pages.dev/data/gate.json
SHA256: `87c86bd55440a4f094faa615d751d087b374cde7114e52f8b9b200ee84974ab6`

Structure:
```json
{
  "papers": {
    "kind": "array",
    "rows": 264,
    "itemType": "dict",
    "fields": [
      "y",
      "c",
      "n",
      "parent",
      "kind",
      "p"
    ]
  },
  "summary": {
    "kind": "array",
    "rows": 178,
    "itemType": "dict",
    "fields": [
      "y",
      "c",
      "reg",
      "app",
      "qual",
      "qpct",
      "mean",
      "sd",
      "mt",
      "qm",
      "qs",
      "maxM",
      "minM",
      "maxS",
      "minS",
      "groups",
      "p",
      "pm",
      "note"
    ]
  },
  "cats": {
    "kind": "array",
    "rows": 925,
    "itemType": "packed_row",
    "width": 9
  },
  "dist": {
    "kind": "array",
    "rows": 2883,
    "itemType": "dict",
    "fields": [
      "y",
      "c",
      "pop",
      "cat",
      "m",
      "p",
      "note",
      "bins"
    ]
  },
  "ranks": {
    "kind": "array",
    "rows": 178,
    "itemType": "dict",
    "fields": [
      "y",
      "c",
      "p",
      "bands"
    ]
  },
  "gender": {
    "kind": "array",
    "rows": 324,
    "itemType": "packed_row",
    "width": 7
  }
}
```

### gate-extra

File: `raw/data/gate-extra.json` (81,263 bytes)
URL: https://score-line.pages.dev/data/gate-extra.json
SHA256: `36c00a60094c21f319eb20cc8c21a796dd991c044d5d85efbfe651d7525f1c66`

Structure:
```json
{
  "stateGender": {
    "kind": "array",
    "rows": 456,
    "itemType": "packed_row",
    "width": 8
  },
  "stateCategory": {
    "kind": "array",
    "rows": 798,
    "itemType": "packed_row",
    "width": 8
  },
  "stateTop": {
    "kind": "array",
    "rows": 114,
    "itemType": "packed_row",
    "width": 7
  },
  "degree": {
    "kind": "array",
    "rows": 120,
    "itemType": "packed_row",
    "width": 7
  },
  "discipline": {
    "kind": "array",
    "rows": 148,
    "itemType": "packed_row",
    "width": 6
  },
  "topInst": {
    "kind": "array",
    "rows": 50,
    "itemType": "packed_row",
    "width": 7
  },
  "twoPaper": {
    "kind": "array",
    "rows": 62,
    "itemType": "packed_row",
    "width": 7
  }
}
```

### psu

File: `raw/data/psu.json` (586,412 bytes)
URL: https://score-line.pages.dev/data/psu.json
SHA256: `36e4155415a56e0a525a3b6366bcbdcdb4b4a98b8622a107860ed21cad3c10b1`

Packed row columns: `["psu", "year", "gate", "post", "paper", "cat", "stage", "unit", "v", "text", "unitText", "src", "conf", "note", "round"]`

Structure:
```json
{
  "cols": {
    "kind": "array",
    "rows": 15,
    "itemType": "str"
  },
  "psus": {
    "kind": "array",
    "rows": 43,
    "itemType": "str"
  },
  "posts": {
    "kind": "array",
    "rows": 213,
    "itemType": "str"
  },
  "papers": {
    "kind": "array",
    "rows": 20,
    "itemType": "packed_row",
    "width": 2
  },
  "logos": {
    "kind": "array",
    "rows": 43,
    "itemType": "packed_row",
    "width": 3
  },
  "full": {
    "kind": "array",
    "rows": 43,
    "itemType": "str"
  },
  "cats": {
    "kind": "array",
    "rows": 64,
    "itemType": "str"
  },
  "src": {
    "kind": "array",
    "rows": 257,
    "itemType": "dict",
    "fields": [
      "k",
      "u",
      "f",
      "l"
    ]
  },
  "str": {
    "kind": "array",
    "rows": 265,
    "itemType": "str"
  },
  "cuts": {
    "kind": "array",
    "rows": 3644,
    "itemType": "packed_row",
    "width": 15
  },
  "counts": {
    "kind": "array",
    "rows": 2922,
    "itemType": "packed_row",
    "width": 12
  },
  "terms": {
    "kind": "array",
    "rows": 579,
    "itemType": "packed_row",
    "width": 7
  }
}
```

### bits

File: `raw/data/bits.json` (15,938 bytes)
URL: https://score-line.pages.dev/data/bits.json
SHA256: `01d407ed5aea26848fb4e0a40d95a142e908485805256858c3235f04db3563d9`

Packed row columns: `["year", "campus", "prog", "route", "measure", "iteration", "n", "low", "median", "high"]`

Structure:
```json
{
  "cols": {
    "kind": "array",
    "rows": 10,
    "itemType": "str"
  },
  "offered": {
    "kind": "object",
    "keys": [
      "year",
      "src",
      "rows"
    ]
  },
  "official": {
    "kind": "array",
    "rows": 5,
    "itemType": "dict",
    "fields": [
      "k",
      "text",
      "src"
    ]
  },
  "campuses": {
    "kind": "array",
    "rows": 3,
    "itemType": "str"
  },
  "progs": {
    "kind": "array",
    "rows": 15,
    "itemType": "str"
  },
  "progFam": {
    "kind": "array",
    "rows": 15,
    "itemType": "str"
  },
  "measures": {
    "kind": "object",
    "keys": [
      "gate",
      "gpat",
      "hd",
      "hd_ss"
    ]
  },
  "offers": {
    "kind": "array",
    "rows": 213,
    "itemType": "packed_row",
    "width": 10
  },
  "noOffer": {
    "kind": "array",
    "rows": 14,
    "itemType": "packed_row",
    "width": 8
  },
  "ug": {
    "kind": "array",
    "rows": 44,
    "itemType": "packed_row",
    "width": 4
  },
  "meta": {
    "kind": "object",
    "keys": [
      "responses",
      "repeats",
      "offers",
      "no_offer",
      "left_out",
      "gate_marks_dropped",
      "judged"
    ]
  },
  "src": {
    "kind": "object",
    "keys": [
      "k",
      "l"
    ]
  }
}
```

### sources

File: `raw/data/sources.json` (251,109 bytes)
URL: https://score-line.pages.dev/data/sources.json
SHA256: `ef32c24b42b1602305a533a37d1cc9220d872b5e5adb43fc3f496d623da60371`

Structure:
```json
{
  "kind": "array",
  "rows": 1314,
  "itemType": "dict",
  "fields": [
    "f",
    "kind",
    "code",
    "season",
    "ext",
    "bytes",
    "cites",
    "also",
    "mine"
  ]
}
```

## Company row schema

There is no `cols` property. Decoded from public client table/filter code, the 17 packed row positions are:

`companyIndex, instituteIndex, season, programmeIndex, familyIndex, departmentStringIndex, employmentTypeIndex, offers, ctcLpa, ctcTextStringIndex, roleStringIndex, printedCompanyNameStringIndex, sourceKindIndex, sourceIndex, documentGroupId, printedSeasonStringIndex, noteStringIndex`

Dictionaries: `cos`, `insts`, `progs`, `fams`, `types`, `kinds`, `str`, `src`. A negative string/family index means unspecified. `documentGroupId` is an identity/grouping field, not a count. `sourceIndex` identifies individual evidence metadata; do not replace document-group logic with source-index sums.

## Aggregate views

`options` and `hero`: programme labels live in `prog`, not source rows. Rows live in `cats[category]`. `options.cols` and `payCols` describe packed result/pay rows. These derived views must not count as additional independent admission records. `compare` and `branch` are aggregate/index views too; use them for institute labels, discovery and matched summaries, with original tables as evidence.
