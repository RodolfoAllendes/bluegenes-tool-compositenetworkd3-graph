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
		this.initExportHandlers();

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
	 * Handle CheckBox user interaction
	 */
	initCheckboxHandler(){
		let self = this;
		d3.selectAll('#rightColumn_compositeNetwork input.displayCB')
			.on('change', function(){ 
				self.network.setDisplayLayer(this.dataset.layer, this.checked);
				self.plot();		
			});
	}
	initExportHandlers(){
		d3.select('#compositeNetworkD3-graph #exportButton')
			.on('click', function(){
				d3.select('#compositeNetworkD3-graph div.im-modal')
					.style('display', 'flex');
			});
		d3.selectAll('#compositeNetworkD3-graph a.close')
			.on('click', function(){
				d3.select('#compositeNetworkD3-graph div.im-modal')
					
				.style('display', 'none');
			});
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
	 */
	nodeDragged(event,d) {
		let x = event.x < d.r ? d.r : event.x > d.xmax-d.r ? d.xmax-d.r : event.x;
		let y = event.y < d.ymin+d.r ? d.ymin+d.r : event.y > d.ymax-d.r ? d.ymax-d.r : event.y;
		
		/* find edges associated to this node */
		d3.selectAll('#canvas_compositeNetwork #edges line')
			.filter(function(line){
				return line.source.id === d.id;
			})
			.raise()
			.attr('x1', d.x1 = x)
			.attr('y1', d.y1 = y)
			.attr('stroke', 'black');

		d3.selectAll('#canvas_compositeNetwork #edges line')
			.filter(function(line){
				return line.target.id === d.id;
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
			.attr('dx', d.dx = x)
			.attr('dy', d.dy = y);
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
			.attr('stroke', 'lightGray');
		// NEED TO PERSIST THE FINAL COORDINATES TO THE NETWORK
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
		
		// self.r = self.network.initLayerNodesPositions(this.dataset.layer, self._width, self._height);
		// d3.select('#canvas_compositeNetwork')
		// 	.call(self.screenZoom.transform, d3.zoomIdentity)
		// 	.call(self.screenZoom);
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
				.attr('x2', d => d.target.x)
				.attr('y1', d => d.source.y)
				.attr('y2', d => d.target.y)
				.attr('sid', d => d.source.id)
				.attr('tid', d => d.target.id)
				.attr('stroke', 'lightGray');
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
					self.setInfo(i.tmClass, i.symbol, i.id);
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
			.attr('dx', d => d.x)
			.attr('dy', d => d.y)
			.style('font-size', function(){ 
				let size = (1.7 * self.r - 8) / this.getComputedTextLength() * 24;
				size = size <0 ? 0 : size;
				return Math.min(self.r, size)+'px'; 
			})
			.style('text-anchor', 'middle');
	}

	/**
	 * 
	 * @param {*} target 
	 */
	setInfo(layer, symbol, id){
		let self = this;
		d3.select('#nodeLayer-div label')
			.text(layer);
		d3.select('#nodeSymbol-div label')
			.text(symbol)
			.on('click', function(){
				self.navigate('report', {
					type: layer,
					id: id
				});
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


	saveGraph(){
		let graph = d3.select('#canvas_compositeNetwork').node();
		graph.setAttribute('xlink', 'http://www.w3.org/1999/xlink');
		
		let cssStyleText = this.getCSSStyles(graph);
		
		let styleElement = document.createElement('style');
		styleElement.setAttribute('type','text/css');
		styleElement.innerHTML = cssStyleText;
		
		let refNode = graph.hasChildNodes() ? graph.children[0] : null;
		graph.insertBefore( styleElement, refNode );	
		
		graph.setAttribute('width', this._width);
		graph.setAttribute('height', this._height);
		
		let serializer = new XMLSerializer();
		let svgString = serializer.serializeToString(graph);
		svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); // Fix root xlink without namespace
		svgString = svgString.replace(/NS\d+:href/g, 'xlink:href'); // Safari NS namespace fix
		

		// passes Blob and filesize String to the callback
		this.svgString2Image( svgString, 2*this._width, 2*this._height, save );
		function save(dataBlob){
			saveAs(dataBlob, 'graph.png');
		}
	}

	getCSSStyles(node){
		let selectorTextArr = new Set();

		// Add Parent element Id and Classes to the list
		selectorTextArr.add( '.bluegenesToolCompositeNetworkd3Graph #'+node.id );
		node.classList.forEach(c => selectorTextArr.add('.bluegenesToolCompositeNetworkd3Graph svg.'+c));

		// Add Children element Ids and Classes to the list
		d3.select('#compositeNetworkD3-graph #'+node.id).selectAll('*')
			.each(function(){
				selectorTextArr.add('#compositeNetworkD3-graph #'+this.id);
				this.classList.forEach(c => selectorTextArr.add('#compositeNetworkD3-graph .'+c));
			});
		
		// Extract CSS Rules
		let extractedCSSText = '';
		for (let i = 0; i < document.styleSheets.length; i++) {
			let s = document.styleSheets[i];

			try {
				if(!s.cssRules) continue;
			} catch( e ) {
				if(e.name !== 'SecurityError') throw e; // for Firefox
				continue;
			}

			let cssRules = s.cssRules;
			for (let r = 0; r < cssRules.length; r++) {
				if (selectorTextArr.has(cssRules[r].selectorText))
					extractedCSSText += cssRules[r].cssText;
			}
		}
		return extractedCSSText;
	}

	svgString2Image(svgString, width, height, callback){
		
		let imgsrc = 'data:image/svg+xml;base64,'+ btoa( unescape( encodeURIComponent( svgString ) ) ); // Convert SVG string to data URL

		let canvas = d3.select('div.bluegenesToolCompositeNetworkd3Graph')
			.append('canvas')
			.attr('width', width)
			.attr('height', height)
			.style('display', 'none');
		let context = canvas.node().getContext('2d');				 
		let image = new Image();
		image.onload = function() {
			// draw a white background
			context.fillStyle='#FFFFFF';
			context.fillRect( 0, 0, width, height );

			context.drawImage(image, 0, 0, width, height);
			canvas.node().toBlob( function(blob) {
				if ( callback ) callback( blob );//, filesize );
			}, 'image/png');

		
		};
		image.src = imgsrc;
	}


}


