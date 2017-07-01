const SegmentationWorker = require('worker-loader!./worker.js');
import Utils from './Utils';
import sigma from 'sigma';

function getParameterByName(name, url) {
	if (!url) url = window.location.href;
	name = name.replace(/[\[\]]/g, "\\$&");
	var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
		results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, " "));
}

/**
 * UI Class
 */
class UI {
	/**
	 * Class Constructor
	 */
	constructor() {
		const c = document.getElementById("original-image-canvas"),
			ctx = c.getContext("2d");

		this.isDrawing = false;
		this.lastCoord = { x : 0, y : 0};
		this.canvas = c;
		this.ctx = ctx;
		this.foregroundBtn = document.getElementById('foreground');
		this.backgroundBtn = document.getElementById('background');
		this.eraseBtn = document.getElementById('erase');
		this.segmentBtn = document.getElementById('segment');
		this.imageDropdown = document.getElementById('image-selection');
		this.spinner = document.getElementById('spinner');
		this.foregroundSeedPixels = {};
		this.backgroundSeedPixels = {};
		this.currentSeed = false;
		this.savedImageData = false;
		this.scale_factor = 5;

		const image = getParameterByName('image') ? getParameterByName('image') : 'black-cat.jpg';
		Array.from( this.imageDropdown.getElementsByTagName('option') ).forEach( option => {
			option.selected = option.value === image;
		});

		this.loadImage( this.ctx, `images/${image}` );
		this.setUpSeedsUI();

		this.segmentBtn.addEventListener('click', (e) => {
			const worker = new SegmentationWorker();
			this.loading();
			console.log(this);
			worker.postMessage( { image : this.savedImageData, obj_seeds: this.foregroundSeedPixels, bkp_seeds : this.backgroundSeedPixels} );
			worker.addEventListener('message', (e) => {
				//console.log( e.data );
				const s = new sigma('container');

				e.data.graph.nodes.forEach( (node) => {
					s.graph.addNode(node);
				} );
				e.data.graph.edges.forEach( (edge) => s.graph.addEdge(edge) );
				s.refresh();
				const canvas = document.getElementById('segmented_image'),
					ctx = canvas.getContext('2d');
				canvas.width = this.canvas.width;
				canvas.height = this.canvas.height;

				const A = e.data.segmentation;
				for(let p = 0; p < this.savedImageData.data.length; p+=4){
					if ( A[p/4] == 'bkp' ) {
						this.savedImageData.data[p+3] = 0;
					}
				}

				ctx.putImageData(this.savedImageData,0,0);

				const ImageObj = new Image();
				ImageObj.src = canvas.toDataURL();
				ImageObj.onload = () => {
					ctx.clearRect(0,0,canvas.width,canvas.height);
					ctx.scale(this.scale_factor, this.scale_factor);
					ctx.drawImage(ImageObj,0,0);
					this.convertToGrayscale( ctx );
				};

				this.removeLoading();
			});
		});
		this.imageDropdown.addEventListener('change', (e) => {
			let url = window.location.href .replace( window.location.search, '');
			window.location.href = url + '?image=' + e.target.value;
		});

	}

	/**
	 * Loads an image into the canvas
	 *
	 * @param context
	 * @param src
	 */
	loadImage( context, src ) {
		const img = new Image();
		img.src = src;
		img.onload = () => {
			this.canvas.width = img.width * this.scale_factor;
			this.canvas.height = img.height * this.scale_factor;
			this.w = img.width;
			this.h = img.height;
			context.drawImage(img, 0,0);
			this.savedImageData = context.getImageData(0,0, img.width, img.height);
			context.scale(this.scale_factor,this.scale_factor);
			context.drawImage(img, 0,0);

			this.convertToGrayscale( context );
		};
	}

	loading() {
		this.spinner.classList.remove('hidden');
		this.foregroundBtn.setAttribute('disabled', 'disabled' );
		this.backgroundBtn.setAttribute('disabled', 'disabled' );
		this.segmentBtn.setAttribute('disabled', 'disabled' );
		this.spinner.classList.add('visible');
	}

	removeLoading() {
		this.spinner.classList.add('hidden');
		this.spinner.classList.remove('visible');
		this.foregroundBtn.removeAttribute('disabled');
		this.backgroundBtn.removeAttribute('disabled');
		this.segmentBtn.removeAttribute('disabled');
	}

	/**
	 * Converts what's currently in the canvas contex to grayscale
	 * @param context
	 */
	convertToGrayscale( context ) {
		const imageData = context.getImageData(0,0,this.canvas.width,this.canvas.height);
		const data = imageData.data;

		for(let i = 0; i < data.length; i+=4){
			const average = (data[i] + data[i+1] + data[i+2] ) / 3;
			data[i] = average;
			data[i+1] = average;
			data[i+2] = average;
		}

		context.putImageData(imageData, 0, 0);
	}

	/**
	 * Sets up the Seed Related UI
	 */
	setUpSeedsUI() {
		this.canvas.addEventListener('mousedown', (e) => {
			this.isDrawing = true;
			const offsetX = Math.round( e.offsetX / this.scale_factor );
			const offsetY = Math.round( e.offsetY / this.scale_factor );
			this.lastCoord.x = offsetX;
			this.lastCoord.y = offsetY;

			this.addSeed(offsetX, offsetY);
		});

		this.canvas.addEventListener('mousemove', (e) => this.drawSeed(e) );
		this.canvas.addEventListener('mouseup', () => this.isDrawing = false);
		this.canvas.addEventListener('mouseout', () => this.isDrawing = false);

		//control buttons
		this.foregroundBtn.addEventListener('click', () => this.currentSeed = 'foreground');
		this.backgroundBtn.addEventListener('click', () => this.currentSeed = 'background');
		//this.eraseBtn.addEventListener('click', (e) => this.restoreCanvas(e) );
	}

	/**
	 * Restore canvas to its original state
	 *
	 * @param e
	 */
	restoreCanvas(e) {
		if ( this.savedImageData !== false ) {
			this.ctx.putImageData(this.savedImageData, 0, 0);
		}
	}


	addSeed(offsetX, offsetY) {
		for( let i = offsetX - this.ctx.lineWidth; i < offsetX + this.ctx.lineWidth; i++ ) {
			for( let j = offsetY - this.ctx.lineWidth; j < offsetY + this.ctx.lineWidth; j++ ) {
				let pixelOffset = Utils.getPixelOffset(i, j, this.w);
				if ( 0 <= i && i < this.w && 0 <= j && j < this.h ) {
					if ( this.currentSeed === 'foreground' ) {
						this.foregroundSeedPixels[ pixelOffset ] = true;
					} else {
						this.backgroundSeedPixels[ pixelOffset ] = true;
					}
				}
			}
		}
	}

	/**
	 * Draws the seeds brushes
	 * @param e
	 */
	drawSeed(e) {
		if ( ! this.isDrawing || this.currentSeed === false ) {
			return;
		}

		this.ctx.lineWidth = 3;

		const offsetX = Math.round( e.offsetX / this.scale_factor );
		const offsetY = Math.round( e.offsetY / this.scale_factor );

		this.ctx.strokeStyle = this.currentSeed === 'foreground' ? '#BADA55' : '#DA3A43';
		this.addSeed(offsetX, offsetY);

		this.ctx.beginPath();
		this.ctx.moveTo(this.lastCoord.x, this.lastCoord.y);

		this.ctx.lineJoin = 'round';
		this.ctx.lineCap = 'round';
		this.ctx.lineTo(offsetX, offsetY);
		this.ctx.stroke();

		this.lastCoord.x = offsetX;
		this.lastCoord.y = offsetY;
	}
}

export default UI;