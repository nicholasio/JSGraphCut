import Utils from './Utils';
import sigma from 'sigma';
import MaxFlow from './MaxFlow';

const nj = require('./numjs');

function componentToHex(c) {
	var hex = c.toString(16);
	return hex.length == 1 ? "0" + hex : hex;
}

function yToHex(y) {
	return "#" + componentToHex(y) + componentToHex(y) + componentToHex(y);
}

class SegmentedImage {
	constructor(image, foregroundSeedPixels, backgroundSeedPixels) {
		this.img = image;
		[this.w,this.h] = [this.img.width, this.img.height];
		this.pixel_values = image.data;

		this.obj_seeds = foregroundSeedPixels;
		this.bkp_seeds = backgroundSeedPixels;

		this.lambda_factor = 1;
		this.sigma_factor = 40;

		sigma.classes.graph.addMethod( 'maxFlow', function(source,target) {
			return new MaxFlow(this, source, target).DinicMaxFlow();
		});
		sigma.classes.graph.addMethod( 'hasEdge', function(id) {
			return id in this.edgesIndex;
		});

		this.calculateBoundaryCosts();
	}

	specialNeighbours(x,y) {
		return [{ x : x-1 , y: y }, { x: x+1, y: y }, { x: x, y: y-1}, {x: x, y: y+1} ].filter( (coord) => {
			return 0 <= coord.x && coord.x < this.w && 0 <= coord.y && coord.y < this.h && (coord.x !== x || coord.y !== y);
		});
	}

	boundaryPenalty(p_a,p_b) {
		const i_delta = this.pixel_values[p_a] - this.pixel_values[p_b];
		const pCoord_a = Utils.getPixelCoord(p_a, this.w);
		const pCoord_b = Utils.getPixelCoord(p_b, this.w);

		const distance = Math.sqrt( Math.pow(pCoord_b.y - pCoord_a.y,2) + Math.pow(pCoord_b.x - pCoord_a.x,2) );

		return Math.exp( - (i_delta*i_delta) / (2.0 * Math.pow(this.sigma_factor,2) ) ) / distance;
	}

	calculateBoundaryCosts() {
		this.boundary_costs = {};
		this.boundary_sum = {};
		let max = 0;
		for(let p = 0; p < this.pixel_values.length; p+=4){
			this.boundary_costs[p] = {};
			this.boundary_sum[p] = 0;
			const pCoord = Utils.getPixelCoord(p, this.w);
			this.specialNeighbours(pCoord.x, pCoord.y).forEach( (coord) => {
				const n_p = Utils.getPixelOffset(coord.x, coord.y, this.w);
				this.boundary_costs[p][n_p] = this.boundaryPenalty(p,n_p);
				this.boundary_sum[p] += this.boundary_costs[p][n_p];
			});

			if ( max < this.boundary_sum[p] ) {
				max = this.boundary_sum[p];
			}
		}

		//calculating K
		this.k_factor = 1.0 + max ;
	}

	calculate_normal(points) {
		const values = Object.keys(points).map( p => this.pixel_values[p] );
		return [ nj.mean(values), Math.max( nj.std(values), 0.00001 )];
	}

	norm_pdf(x,mu,sigma) {
		const factor = (1.0 / (Math.abs(sigma) * Math.sqrt(2 * Math.PI)));
		return factor * Math.exp( -Math.pow((x-mu),2) / (2.0 * Math.pow(sigma,2)) )
	}

	regional_cost(point,mean,std) {
		const prob = Math.max(this.norm_pdf(this.pixel_values[point],mean,std), 0.000000000001);
		return - this.lambda_factor * Math.log(prob);
	}

	make_id(x,y) {
	return `${x},${y}`;
}

	createGraph() {
		this.graph = new sigma.classes.graph();
		this.obj_node = {
			id : 'obj',
			x : -2,
			y : -2,
			label : 'obj',
			size : 1
		};
		this.graph.addNode(this.obj_node);
		this.bkp_node = {
			id : 'bkp',
			x : this.w + 1,
			y : this.h + 1,
			label : 'bkp',
			size: 1
		};
		this.graph.addNode(this.bkp_node);

		for(let p = 0; p < this.pixel_values.length; p+=4){
			const coord = Utils.getPixelCoord(p,this.w,this.h);
			this.graph.addNode({
				id : p,
				x : coord.x,
				y : coord.y,
				size : 0.3,
				label: `Ip = ${this.pixel_values[p]}; x: ${coord.x}, y: ${coord.y}`,
				color: yToHex(this.pixel_values[p])
			});
		}
		//inter pixel edges
		for( let x = 0; x < this.w; x++ ) {
			for( let y = 0; y < this.h; y++ ) {
				const p = Utils.getPixelOffset(x,y,this.w);
				this.specialNeighbours(x, y).forEach( (coord) => {
					const n_p = Utils.getPixelOffset(coord.x, coord.y, this.w);
					if ( ! this.graph.hasEdge( this.make_id(p,n_p) ) ) {
						this.graph.addEdge({
							id : this.make_id(p,n_p),
							source : p,
							target : n_p,
							capacity : this.boundary_costs[p][n_p],
							color: '#ccc',
						});
					}
					if ( ! this.graph.hasEdge( this.make_id(n_p, p) ) ) {
						this.graph.addEdge({
							id : this.make_id(n_p,p),
							source : n_p,
							target : p,
							capacity : this.boundary_costs[p][n_p],
							color: '#ccc',
						});
					}
				});
			}
		}

		//obj/bkp edges
		for(let p = 0; p < this.pixel_values.length; p+=4){
			this.graph.addEdge({
				id : this.make_id('obj',p),
				source : 'obj',
				target : p,
				capacity : this.regional_penalty_obj[p]
			});
			this.graph.addEdge({
				id : this.make_id(p, 'obj'),
				source : p,
				target : 'obj',
				capacity : this.regional_penalty_obj[p]
			});

			this.graph.addEdge({
				id : this.make_id('bkp',p),
				source : p,
				target : 'bkp',
				capacity :this.regional_penalty_bkp[p]
			});
			this.graph.addEdge({
				id : this.make_id(p,'bkp'),
				source : 'bkp',
				target : p,
				capacity :this.regional_penalty_bkp[p]
			});
		}
	}

	segment() {
		//Updating regional penalties
		let obj_mean, obj_std, bkp_mean, bkg_std;
		[obj_mean,obj_std] = this.calculate_normal(this.obj_seeds);
		[bkp_mean,bkg_std] = this.calculate_normal(this.bkp_seeds);

		this.regional_penalty_obj = {};
		this.regional_penalty_bkp = {};

		for(let p = 0; p < this.pixel_values.length; p+=4){
			if (  p in this.obj_seeds ) {
				this.regional_penalty_obj[p] =  this.k_factor;
				this.regional_penalty_bkp[p] = 0;
			} else {
				if ( p in this.bkp_seeds ) {
					this.regional_penalty_obj[p] = 0;
					this.regional_penalty_bkp[p] = this.k_factor;
				} else {
					this.regional_penalty_obj[p] = this.regional_cost(p, bkp_mean, bkg_std);
					this.regional_penalty_bkp[p] = this.regional_cost(p, obj_mean, obj_std);
				}
			}
		}

		//create the graph
		this.createGraph();
		console.log( 'Done Creating Graph ');
		const mf = this.graph.maxFlow(this.obj_node, this.bkp_node);
		console.log( 'MafFLow: '+  mf.value);
		const cut = mf.minCut();
		this._segmentation = [];

		for(let p = 0; p < this.pixel_values.length; p+=4){
			if ( this.make_id('bkp',p) in cut ) {
				this._segmentation[p/4] = 'obj';
			} else {
				this._segmentation[p/4] = 'bkp';
			}
		}
		this.graph = { nodes: this.graph.nodes(), edges: this.graph.edges() };
	}
}

export default SegmentedImage;