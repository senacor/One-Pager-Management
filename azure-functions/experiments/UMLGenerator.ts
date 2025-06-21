import { createDiagram, TsUML2Settings } from 'tsuml2';


const settings = new TsUML2Settings();
settings.glob = `./src/functions/**/!(*.d|*.spec).ts`;
settings.outFile = './experiments/umlDiagram.svg';
settings.memberAssociations = true;
settings.exportedTypesOnly = true; // only files with export
settings.modifiers = false;
settings.typeLinks = true; // clicking on diagram elements opens file
settings.tsconfig = './tsconfig.json';
settings.propertyTypes = true; // are the types of the properties of classes shown
settings.outDsl = './experiments/diagram.dsl';
settings.nomnoml = [
    "#.interface: fill=lightblue",
    "#.enumeration: fill=lightgreen",
    "#.type: fill=lightgreen",
    "#stroke: black",
    "#fill: lightgray"
];
settings.mermaid = [
    "classDef default fill:#afa,stroke:#afa,stroke-width:5px;"
];
settings.outMermaidDsl = './experiments/umlDiagram.mmd';
createDiagram(settings);
