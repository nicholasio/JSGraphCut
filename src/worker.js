import SegmentedImage from './SegmentedImage';

self.addEventListener( 'message', (e) => {
	console.log(e);
	const segmentedImage = new SegmentedImage( e.data.image, e.data.obj_seeds, e.data.bkp_seeds );
	segmentedImage.segment();
	self.postMessage( { graph: segmentedImage.graph, segmentation : segmentedImage._segmentation } );
} );