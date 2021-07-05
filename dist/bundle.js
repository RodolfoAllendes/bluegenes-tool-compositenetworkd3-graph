var bluegenesToolCompositeNetworkd3Graph=function(t){var e={};function n(i){if(e[i])return e[i].exports;var o=e[i]={i:i,l:!1,exports:{}};return t[i].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=t,n.c=e,n.d=function(t,e,i){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:i})},n.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},n.t=function(t,e){if(1&e&&(t=n(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var i=Object.create(null);if(n.r(i),Object.defineProperty(i,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var o in t)n.d(i,o,function(e){return t[e]}.bind(null,o));return i},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="",n(n.s=0)}([function(t,e,n){"use strict";n.r(e),n.d(e,"main",(function(){return r}));class i{constructor(){this.nodes=new Map,this.layers=new Map,this.vm=new Map,this.edges=new Map}addLayer(t,e,n,i){this.layers.set(t,{color:e,shape:n,display:i})}parseNodes(t,e,n,i){let o=this.vm.get(e)||new Set;t.forEach(t=>{this.nodes.set(t[n],i.reduce((e,n)=>"string"==typeof n?{...e,[n]:t[n]}:{...e,[n[1]]:t[n[0]][n[1]]},{})),o.add(t[n])},this),this.vm.set(e,o)}parseEdges(){}}class o{constructor(t,e){this.model=t,this.geneList=e,this.network=new i,this.network.addLayer("Gene","yellow","ellipse",!0),this.network.parseNodes(e,"Gene","objectId",["primaryIdentifier","symbol"]),this.network.addLayer("Compound","lime","hexagon",!0),this.network.parseNodes(e[0].proteins[0].compounds,"Compound","objectId",[["compound","originalId"],["compound","name"]]),this.network.addLayer("miRNA","cyan","triangle",!0),this.network.parseNodes(e[0].miRNAInteractions,"miRNA","objectId",[["miRNA","primaryIdentifier"],["miRNA","symbol"]]),this.network.addLayer("PPI","LightGray","ellipse",!0),this.network.parseNodes(e[0].interactions,"PPI","objectId",[["gene2","primaryIdentifier"],["gene2","symbol"]])}}function r(t,e,n,i,r){if(i||(i={}),!(t&&e&&n&&i&&r))throw new Error("Call main with correct signature");let s=new imjs.Service(e);s.fetchModel().then(t=>{let e=new imjs.Query({model:t});return e.adjustPath("Gene"),e.select(["primaryIdentifier","symbol","organism.name","proteins.compounds.compound.identifier","proteins.compounds.compound.name","proteins.compounds.compound.inchiKey","proteins.compounds.compound.originalId","miRNAInteractions.miRNA.primaryIdentifier","miRNAInteractions.miRNA.symbol","interactions.gene2.primaryIdentifier","interactions.gene2.symbol"]),e.addConstraint({path:"id",op:"one of",values:n.Gene.value}),e.addJoin("miRNAInteractions"),e.addJoin("proteins"),e.addJoin("interactions"),Promise.all([t,s.records(e)])}).then(([t,e])=>{window.CompositeNetwork=new o(t,e)}),t.innerHTML='\n\t\t<div class="rootContainer">\n\t\t\t<div id="compositeNetworkD3-graph" class="targetmineGraphDisplayer">\n\t\t\t\t<svg id="canvas_compositeNetwork" class="targetmineGraphSVG"></svg>\n\t\t\t\n\t\t\t\t<div id="rightColumn_compositeNetwork" class="rightColumn">\n\t\t\t\t\t<div id="interactions-div" class="flex-table">\t\n\t\t\t\t\t\t<label>Interaction Types:</label>\n\t\t\t\t\t\t<div id="interactions-tf" class="flex-row">\n\t\t\t\t\t\t\t<input id="cb-tf" type="checkbox"></input>\n\t\t\t\t\t\t\t<label class="row-label">TF targets<label>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div>PCIs</div>\n\t\t\t\t\t\t<div>PPIs (HCDP)\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div>MTIs\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\t\n\t\t\t\t\t<div>Info</div>\n\t\t\t\t</div>\n\t\t\t\t<div id="modal_compositeNetwork" class="targetmineGraphModal">\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t</div>\n\t'}}]);