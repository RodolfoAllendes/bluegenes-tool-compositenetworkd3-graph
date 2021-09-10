'use strict';
import { MultiLayerNetwork } from './MultiLayerNetwork';
// import { Sortable } from 'sortablejs';
import { saveAs } from 'file-saver';
const d3 = require('d3');

export class CompositeNetworkD3{
	
	/**
	 * constructor
	 * @param {object} model TargetMine genomic model
	 * @param {object} geneList Initial data - a list of gene entities
	 * @param {function} navigate Function used to navigate between TM pages
	 */
	constructor(model, geneList, navigate) {
		// Sortable.create(document.getElementById('interactions-div'),{});
		this.model = model;
		this.navigate = navigate;
		
		// process initial data data into a MultiLayer Network instance 
		this.network = new MultiLayerNetwork();
		this.network.addLayer('Gene', 0, 'Gene', 'yellow', 'ellipse', true);
		// add the source gene list to the network
		let genes = geneList.map(g => {
			return { 
				dbid: g.objectId, 
				id: g.primaryIdentifier,	
				symbol: g.symbol, 
				linkedTo: undefined
			};
		});
		this.network.addNodes('Gene', genes);

		// initialize interaction handlers
		this.initCheckboxHandler();
		this.initExportHandler();
		
		this._width = parseInt(d3.select('#canvas_compositeNetwork').style('width'));
		this._height= parseInt(d3.select('#canvas_compositeNetwork').style('height'));
		
		this.screenZoom = d3.zoom()
			.extent([[0,0],[this._width, this._height]])
			.on('zoom', this.zoomed);

		this.nodeDrag = d3.drag()
			.subject((event,d) => d == null ? {x: event.x, y: event.y} : d.network = this.network)
			.on('start', this.nodeDragStarted)
			.on('drag', this.nodeDragged)
			.on('end', this.nodeDragEnded);
		
		// plot the initial version of the graph
		this.plot();
	}

	/**
	 * Add nodes to the network
	 * @param {string} layer 
	 * idx
	 * @param {object} data 
	 * tmclass
	 * @param {string} color 
	 * @param {string} shape 
	 * @param {boolean} grouped 
	 * @param {boolean} visible  
	 */
	addData(layer, idx, data, tmclass, color, shape, grouped=true, visible=false){
		// create a new layer in the network
		this.network.addLayer(layer, idx, tmclass, color, shape, visible);
		// and add nodes and edges to it
		this.network.addNodes(layer, data);
		// group nodes if requested
		if(grouped)
			this.network.groupNodesByLayer(layer);
		// display the layer if requested
		if(visible){
			this.plot();
		}		
	}

	/**
	 * Get a string representation of the CSS styles applied to the SVG element of
	 * the graph
	 * @returns the extracted CSS text
	 */
	getCSSStyles(){
		let selectorTextArr = new Set();
		// Add the classes of the root and its childrens to the selector's list
		d3.select('#compositeNetworkD3Graph #canvas_compositeNetwork')
			.call(sel =>{
				sel.node().classList.forEach(c => selectorTextArr.add('.bluegenesToolCompositeNetworkd3Graph .'+c));
				sel.selectAll('*')
					.each(function(){
						this.classList.forEach(c => selectorTextArr.add('.bluegenesToolCompositeNetworkd3Graph .'+c));
					});
			});
		// Extract CSS Rules based on the previous selectors
		let extractedCSSText = '';
		for (let i=0; i<document.styleSheets.length; i++) {
			let s = document.styleSheets[i];
			try {
				if(!s.cssRules) continue;
			} catch( e ) {
				if(e.name !== 'SecurityError') throw e; // for Firefox
				continue;
			}
			let cssRules = s.cssRules;
			for (let j=0; j<cssRules.length; j++) {
				if (selectorTextArr.has(cssRules[j].selectorText))
					extractedCSSText += cssRules[j].cssText;
			}
		}
		return extractedCSSText;
	}

	/**
	 * Handle CheckBox user interaction
	 */
	initCheckboxHandler(){
		let self = this;
		d3.selectAll('#rightColumn_compositeNetwork input.displayCB')
			.on('change', function(){ 
				self.network.setDisplayLayer(this.dataset.layer, this.checked);
				self.initGroupLayerHandler(this.dataset.layer, this.checked);
				self.plot();		
			});
	}

	/**
	 * 
	 */
	initExportHandler(){
		d3.select('#compositeNetworkD3Graph button#exportButton')
			.on('click', function(){
				d3.select('#compositeNetworkD3Graph div.im-modal')
					.style('display', 'flex');
			});
		d3.selectAll('#compositeNetworkD3Graph div.im-modal a.close')
			.on('click', function(){
				d3.select('#compositeNetworkD3Graph div.im-modal')
					.style('display', 'none');
			});
	}

	/**
	 * 
	 * @param {*} layer 
	 * @param {*} enable 
	 */
	initGroupLayerHandler(layer, enable){
		let self = this;
		d3.select('#rightColumn_compositeNetwork i#'+layer)
			.classed('fa-disabled', !enable);
		if(enable){
			d3.select('#rightColumn_compositeNetwork div#'+layer+'.group-layer')
				.on('click', function(){
					self.network.groupNodesByLayer(layer);
					self.plot();
				});
		}
		else	
			d3.select('#rightColumn_compositeNetwork div#'+layer+'.group-layer').on('click', null);
	}
	
	/**
	 * 
	 */
	nodeDragStarted() {
		d3.select(this).attr('stroke', 'black');
	}

	/**
	 * 
	 * @param {*} event 
	 * @param {*} d
	 */
	nodeDragged(event,d) {
		// restrict the resulting (x,y) positioning of the node to locations within
		// its own layer
		let x = event.x < d.r ? d.r : event.x > d.xmax-d.r ? d.xmax-d.r : event.x;
		let y = event.y < d.ymin+d.r ? d.ymin+d.r : event.y > d.ymax-d.r ? d.ymax-d.r : event.y;
		
		/* find edges associated to this node */
		d3.selectAll('#canvas_compositeNetwork #edges line')
			.filter(function(line){
				return line.source.id === d.id && line.source.layer === d.layer;
			})
			.raise()
			.attr('x1', d.x1 = x)
			.attr('y1', d.y1 = y)
			.attr('stroke', 'black');

		d3.selectAll('#canvas_compositeNetwork #edges line')
			.filter(function(line){
				return line.target.id === d.id && line.target.layer === d.layer;
			})
			.raise()
			.attr('x2', d.x2 = x)
			.attr('y2', d.y2 = y)
			.attr('stroke', 'black');
		
		d3.select(this)
			.raise()
			.select('circle')
				.attr('cx', d.x = x)
				.attr('cy', d.y = y);
		
		d3.select(this).select('text')
			.attr('x', d.dx = x)
			.attr('y', d.dy = y);
	}

	/**
	 * 
	 */
	nodeDragEnded(event,d) {
		d3.select(this).attr('stroke', null);
		d3.selectAll('#canvas_compositeNetwork #edges line')
			.filter(function(line){
				return line.source.id === d.id || line.target.id === d.id;
			})
			.attr('stroke', d => d.style.color);
	
		d.network.setNodePosition(d.id,d.layer,d.x,d.y-d.shift);	
	}
	
	/**
	 * 
	 */
	plot(){
		// initialize node positions if neccessary
		this.r = this.network.initNodesPositions(this._width, this._height);
		d3.select('#canvas_compositeNetwork')
			.attr('viewBox', [0,0,this._width,this._height])
			.call(this.screenZoom);
		
		this.plotBackground('#canvas_compositeNetwork #background');
		this.plotEdges('#canvas_compositeNetwork #edges');
		this.plotNodes('#canvas_compositeNetwork #nodes');
	}

	/**
	 * Plot a background to each layer in the graph
	 * @param {} graph 
	 */
	plotBackground(graph){
		/* filter out only displayable layers */
		let data = this.network.getDisplayLayers(this._width, this._height);
		/* plot a series of layer backgrounds */
		d3.select(graph).selectAll('rect')
			.data(data)
			.join('rect')
				.attr('x', 0)
				.attr('y', d => d.shift)
				.attr('width', d => d.width)
				.attr('height', d => d.height)
				.attr('fill', d => d.color)
				.style('opacity', 0.1);
	}

	/**
	 * Plot the edges in the graph
	 * @param {} graph
	 */
	plotEdges(graph){
		let data = this.network.getDisplayEdges();
		d3.select(graph).selectAll('line')
			.data(data)
			.join('line')
				.attr('x1', d => d.source.x)
				.attr('y1', d => d.source.y)
				.attr('sid', d => d.source.id)
				.attr('slayer', d => d.source.layer)
				.attr('x2', d => d.target.x)
				.attr('y2', d => d.target.y)
				.attr('tid', d => d.target.id)
				.attr('tlayer', d => d.target.layer)
				.attr('stroke', d => d.style.color);
	}

	/**
	 * Plot the nodes in the graph
	 * @param {} graph
	 */
	plotNodes(graph){
		let self = this;
		let data = this.network.getDisplayNodes(this.r);
		
		// clear previous nodes
		d3.select(graph).selectAll('g').remove();
		// plot the nodes
		let g = d3.select(graph).selectAll('g')
			.data(data)
			.join('g')
				.call(self.nodeDrag)
				.on('click', function(d,i){
					self.setInfo(i.layer, i.tmClass, i.symbol, i.isGroup, i.id);
					if(d.defaultPrevented) return;
				});

		g.append('circle')
			.attr('r', this.r)
			.attr('cx', d => d.x)
			.attr('cy', d => d.y)
			.attr('fill', d => d.color)
			.attr('stroke', 'black')
			.attr('id', d => d.id);
		
		g.append('text')
			.text(d => d.symbol)
			.attr('x', d => d.x)
			.attr('y', d => d.y)
			.style('font-size', function(){ 
				let size = (1.7 * self.r - 8) / this.getComputedTextLength() * 24;
				size = size <0 ? 0 : size;
				return Math.min(self.r, size)+'px'; 
			})
			.style('text-anchor', 'middle');
	}

	/**
	 * Export the current graph to an image file
	 */
	saveGraph(){
		let self = this;
		let fileType = d3.select('#compositeNetworkD3Graph #fileType').property('value');
		let graph = d3.select('#compositeNetworkD3Graph #canvas_compositeNetwork');
		
		if(fileType === 'PNG')
			graph.attr('xlink', 'http://www.w3.org/1999/xlink');
		else{
			graph.attr('title', 'TargetMine Composite Network Graph');
			graph.attr('version', 1.0);
			graph.attr('xmlns', 'http://www.w3.org/2000/svg');
		}
		
		graph.attr('width', this._width);
		graph.attr('height', this._height);
		graph.insert('style', ':first-child')
			.attr('type','text/css')
			.html(this.getCSSStyles());
					
		let serializer = new XMLSerializer();
		let svgString = serializer.serializeToString(graph.node());
		svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); // Fix root xlink without namespace
		svgString = svgString.replace(/NS\d+:href/g, 'xlink:href'); // Safari NS namespace fix
	
		if(fileType === 'PNG'){
			let imgsrc = 'data:image/svg+xml;base64,'+ btoa(unescape(encodeURIComponent(svgString))); // Convert SVG string to data URL
			let canvas = d3.create('canvas')
				.attr('width', 2*this._width)
				.attr('height', 2*this._height);
				
			let context = canvas.node().getContext('2d');				 
			let image = new Image();
			image.onload = function() {
				context.fillStyle='#FFFFFF';
				context.fillRect( 0, 0, 2*self._width, 2*self._height );
				context.drawImage(image, 0, 0, 2*self._width, 2*self._height);
				canvas.node().toBlob(blob => saveAs(blob, 'graph.png'), 'image/png');
			};
			image.src = imgsrc;
		}
		else{
			let blob = new Blob([svgString], {type: 'image/svg+xml'});
			saveAs(blob, 'graph.svg');
		}
	}

	/**
	 * 
	 * @param {*} layer
	 * @param {string} tmClass
	 * @param {string} symbol
	 * @param {boolean} isGrouped
	 * @param {int} id
	 */
	setInfo(layer, tmClass, symbol, isGroup, id){
		let self = this;
		d3.select('#rightColumn_compositeNetwork #nodeLayer-div label')
			.text(() => isGroup ? 'Grouped '+ tmClass : tmClass);
		d3.select('#rightColumn_compositeNetwork #nodeSymbol-div label')
			.text(() => isGroup ? 'Size: '+symbol : symbol);
		d3.select('#rightColumn_compositeNetwork #nodeId-div label')
			.classed('link', true)
			.text(() => isGroup ? 'Ungroup Node':'Show report page')
			.on('click', function(){
				if(!isGroup){
					self.navigate('report', {
						type: tmClass,
						id: id
					});
				}
				else{
					self.network.ungroupNode(layer,id);
					self.network.initNodesPositions(self._width, self._height);
					self.network.forceInitLayerNodesPositions(layer);
					self.plot();
					d3.select(this).text('');
				}
			});
	}

	/**
	 * 
	 * @param {zoomEvent} t The zoom event as defined in the D3 library
	 */
	zoomed(t){
		d3.select('g#cursor')
			.attr('transform', t.transform);
	}

}