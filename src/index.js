'use strict';
import { CompositeNetworkD3 } from './CompositeNetworkD3.js';

// make sure to export main, with the signature
function main(el, service, imEntity, state, config, navigate) {
	if (!state) state = {};
	if (!el || !service || !imEntity || !state || !config) {
		throw new Error('Call main with correct signature');
	}
	// initialize the TMService	
	let imService = new imjs.Service(service);
	// query for initial data
	let query = {
		from: 'Gene',
		select: ['primaryIdentifier', 'symbol'],
		where: [{ path: 'id', op: 'one of', values: imEntity.Gene.value }]
	};
	
	Promise.all([
		imService.fetchModel(), 
		imService.records(query)]
	).then(([model,genes]) => {
		// create the Composite Network instance
		window.CompositeNetwork = new CompositeNetworkD3(model, genes, navigate);

		// add compounds
		let compoundQuery = {
			from: 'Gene',
			select: [
				'primaryIdentifier',
				'symbol',
				'proteins.compounds.compound.identifier',
				'proteins.compounds.compound.name'
			],
			where: [{ path: 'id', op: 'one of',	values: imEntity.Gene.value	}]
		};
		imService.records(compoundQuery).then(records => {
			let data = [];
			records.forEach(gene => {
				gene.proteins[0].compounds.map(cpd => {
					data.push({
						dbid: cpd.compound.objectId,	
						id: cpd.compound.identifier, 
						symbol: cpd.compound.name,
						linkedTo: gene.objectId,
						linkedLayer: 'Gene' 
					});
				});
			});
			let grouped = data.length > 10 ? true : false;
			window.CompositeNetwork.addData('Compound', 1, data, 'Compound', 'lime', 'hexagon', grouped);
		});
		
		// add miRNA
		let mirnaQuery = {
			from: 'Gene',
			select: [
				'primaryIdentifier',
				'symbol',
				'miRNAInteractions.miRNA.primaryIdentifier',
				'miRNAInteractions.miRNA.symbol'
			],
			where: [{ path:'id', op: 'one of', values: imEntity.Gene.value }]
		};
		imService.records(mirnaQuery).then(records => {
			let data = [];
			records.forEach(gene => {
				gene.miRNAInteractions.map(mirna => {
					data.push({
						dbid: mirna.miRNA.objectId,
						id: mirna.miRNA.primaryIdentifier, 
						symbol: mirna.miRNA.symbol,
						linkedTo: gene.objectId,
						linkedLayer: 'Gene'
					});
				});
			});
			let grouped = data.length > 10 ? true : false;
			window.CompositeNetwork.addData('miRNA', 2, data, 'MiRNA', 'cyan', 'triangle',grouped, false);
		});

		// PPI interactions - This is done in two steps...
		// first we query the PPI associated to the original nodes
		let ppiQuery = {
			from: 'Gene',
			select: [
				'primaryIdentifier',
				'symbol',
				'interactions.gene2.primaryIdentifier',
				'interactions.gene2.symbol'
			],
			where: [
				{ path: 'interactions.confidences.type', op: '=', value: 'HCDP' },
				{ path: 'id', op: 'one of', values: imEntity.Gene.value }
			]
		};
		imService.records(ppiQuery).then(records => {
			// create a set with the id's of the results
			let validNodes = new Set();
			records.forEach(gene => {
				validNodes.add(gene.objectId);
				gene.interactions.forEach(gene2 => validNodes.add(gene2.gene2.objectId));
			});
			// secondly we query intra-set HCDP PPIs
			let intraPPIQuery = {
				from: 'Gene',
				select: [
					'primaryIdentifier',
					'symbol',
					'interactions.gene2.primaryIdentifier',
					'interactions.gene2.symbol'
				],
				where: [
					{ path: 'interactions.confidences.type', op: '=', value: 'HCDP' },
					{ path: 'id', op: 'one of', values: [...validNodes] },
					{ path: 'interactions.gene2.id', op: 'one of', values: [...validNodes] }
				]
			};
			imService.records(intraPPIQuery).then(allPPIs => {
				let data = [];
				allPPIs.forEach(gene => {
					gene.interactions.map(ppi => {
						data.push({
							dbid: ppi.gene2.objectId,
							id: ppi.gene2.primaryIdentifier,
							symbol: ppi.gene2.symbol,
							linkedTo: gene.objectId,
							linkedLayer: 'PPI'
						});
					});
				});
				window.CompositeNetwork.addData('PPI', 3, data, 'Gene', 'gray', 'ellipse', false, false);
			});
		});

		// add transcription factors
		let tfQuery = {
			from: 'Gene',
			select: [
				'primaryIdentifier',
				'symbol',
				'transcriptionalRegulations.targetGene.primaryIdentifier',
				'transcriptionalRegulations.targetGene.symbol',
				'transcriptionalRegulations.dataSets.name'
			],
			where: [
				{ path: 'transcriptionalRegulations.targetGene.id', op: 'one of', values: imEntity.Gene.value }
			]
		};
		imService.records(tfQuery).then(records => {
			let data = records.map(tf => {
				return {
					dbid: tf.objectId,
					id: tf.primaryIdentifier,
					symbol: tf.symbol,
					linkedTo: tf.transcriptionalRegulations[0].targetGene.objectId,
					linkedLayer: 'Gene'
				};
			}); 
			let grouped = data.length > 10 ? true : false;
			window.CompositeNetwork.addData('TF', 4, data, 'Gene', 'LightGreen', 'square', grouped);
		});
	});

	el.innerHTML = `
		<div class="rootContainer">
			<div id="compositeNetworkD3Graph" class="targetMineCompositeNetworkGraph">
				
				<svg id="canvas_compositeNetwork" class="targetMineCompositeNetworkGraphSVG">
						<g id="cursor">
							<g id="background"></g>
							<g id="edges"></g>
							<g id="nodes" cursor="grab"></g>
						</g>
				</svg>
			
				<div id="rightColumn_compositeNetwork" class="rightColumn">
					
					<div id="interactions-div" class="flex-table">	
						<h5 class="report-item-heading">Layers:</h5>
						<div id="interactions-gene" class="flex-row">
							<input id="cb-gene" class="displayCB" type="checkbox" data-layer="Gene" checked disabled></input>
							<label class="row-label">Initial Genes</label>
							<div class="row-cell"></div>
						</div>
						<div id="interactions-pci" class="flex-row">
							<input id="cb-pci" class="displayCB" type="checkbox" data-layer="Compound"></input>
							<label class="row-label">PCIs</label>
							<div class="row-cell group-layer" id="Compound">
								<i id="Compound" class="fa fa-object-group fa-disabled" aria-hidden="true"></i>
							</div>
						</div>
						<div id="interactions-mti" class="flex-row">
							<input id="cb-mti" class="displayCB" type="checkbox" data-layer="miRNA"></input>
							<label class="row-label">MTIs</label>
							<div class="row-cell group-layer" id="miRNA">
								<i id="miRNA" class="fa fa-object-group fa-disabled" aria-hidden="true"></i>
							</div>
						</div>
						<div id="interactions-ppi" class="flex-row">
							<input id="cb-ppi" class="displayCB" type="checkbox" data-layer="PPI"></input>
							<label class="row-label">PPIs (HCDP)</label>
							<div class="row-cell"></div>
						</div>
						<div id="interactions-tf" class="flex-row">
							<input id="cb-tf" class="displayCB" type="checkbox" data-layer="TF"></input>
							<label class="row-label">TF targets</label>
							<div class="row-cell group-layer" id="TF">
								<i id="TF" class="fa fa-object-group fa-disabled" aria-hidden="true"></i>
							</div>
						</div>
					</div>
					
					<div id="information-div" class="flex-table">
						<h5 class="report-item-heading">Node Information:</h5>
						<div id="nodeLayer-div" class="flex-row">
							<label class="row-label">Click on a node to see details...</label>
						</div>
						<div id="nodeSymbol-div" class="flex-row">
							<label class="row-label"></label>
						</div>
						<div id="nodeId-div" class="flex-row">
							<label class="row-label"></label>
						</div>
					</div>

					<button id="exportButton"  class="btn btn-default btn-raised row-button">
						<i class="fa fa-download"></i> 
						Export
					</button>
				
				</div>

				<div class="im-modal">
					<div class="im-modal-content">
						<div class="modal-dialog">
							<div class="modal-content">	
								<div class="modal-header">
									<h4>Export the Composite Network Graph as...
										<a class="close">x</a>
									</h4>
								</div>
								<div class="modal-body">
									<div class="modal-body exporttable-body">
										<form>
											<label>Select image format
												<select id="fileType" class="form-control">
													<option>PNG</option>
													<option>SVG</option>
												</select>
											</label>
										</form>
									</div>
								</div>
								<div class="modal-footer">
									<a class="btn btn-raised btn-primary" onclick="window.CompositeNetwork.saveGraph()">Download now!</a>
								</div>

							</div>
						</div>
					</div>
				</div>
		
			</div>
		</div>
	`;
}

export { main };


