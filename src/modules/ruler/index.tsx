import { fabric } from 'fabric';
import { generateId } from '../../utils';
import { getCanvasVisibleTopLeft } from '../utils/canvasUtils';
import { FixedArray } from '../../types';
import { FABRIC_JSON_ALLOWED_KEYS } from '../../constants';

export const RULER_ELEMENTS = {
	X_RULER_BACKGROUND: 'X_RULER_BACKGROUND',
	Y_RULER_BACKGROUND: 'Y_RULER_BACKGROUND',
	X_RULER_MARKER: 'X_RULER_MARKER',
	Y_RULER_MARKER: 'Y_RULER_MARKER',
	X_RULER_MARKER_TEXT: 'X_RULER_MARKER_TEXT',
	Y_RULER_MARKER_TEXT: 'Y_RULER_MARKER_TEXT',
	X_ON_MOVE_MARKER: 'X_ON_MOVE_MARKER',
	Y_ON_MOVE_MARKER: 'Y_ON_MOVE_MARKER',
	BLOCK: 'BLOCK',
} as const;

export const RULER_LINES = {
	X_RULER_LINE: 'X_RULER_LINE',
	Y_RULER_LINE: 'Y_RULER_LINE',
} as const;

export function getRulerZoomScale(zoom: number): number {
	if (zoom <= 0.02) return 5000;
	if (zoom <= 0.05) return 2500;
	if (zoom <= 0.1) return 1000;
	if (zoom <= 0.2) return 500;
	if (zoom <= 0.5) return 250;
	if (zoom < 1) return 100;
	if (zoom >= 1 && zoom < 2) return 50;
	if (zoom >= 2 && zoom < 5) return 25;
	if (zoom >= 5 && zoom < 10) return 10;
	if (zoom >= 10 && zoom < 15) return 5;
	if (zoom >= 15 && zoom < 20) return 2;
	if (zoom >= 20) return 2;
	return 100;
}

function getAdjustedMarkerTextPosition(num: number) {
	const sign = Math.sign(num) > 0;
	const digits = Math.floor(Math.log10(Math.abs(num))) + 1;
	if (num === 0 || digits === 1) return 3;
	return sign ? 3 + digits : 5 + digits;
}

// render ruler step lines and markers
export function renderRulerStepMarkers(canvasRef: React.MutableRefObject<fabric.Canvas | null>, colorScheme = 'light') {
	canvasRef.current
		?.getObjects()
		.filter(item =>
			[
				RULER_ELEMENTS.X_RULER_MARKER,
				RULER_ELEMENTS.Y_RULER_MARKER,
				RULER_ELEMENTS.X_RULER_MARKER_TEXT,
				RULER_ELEMENTS.Y_RULER_MARKER_TEXT,
				RULER_ELEMENTS.X_ON_MOVE_MARKER,
				RULER_ELEMENTS.Y_ON_MOVE_MARKER,
			].includes(item.data?.type),
		)
		.forEach(item => {
			canvasRef.current?.remove(item);
		});
	const { left, top } = getCanvasVisibleTopLeft(canvasRef);
	const zoom = canvasRef.current?.getZoom() as number;
	const pan = canvasRef.current?.viewportTransform as FixedArray<number, 6>;
	const interval = getRulerZoomScale(zoom);
	const nearest = Math.round(left / interval) * interval;
	const canvasWidth = canvasRef.current?.width as number;
	for (let i = nearest; i < (canvasWidth + -pan[4]) / zoom; i += interval) {
		const line = new fabric.Line([i, 0, i, 5 / zoom], {
			stroke: colorScheme === 'dark' ? '#fff' : '#2c2c2c',
			strokeWidth: 2 / zoom,
			left: i,
			selectable: false,
			hoverCursor: 'default',
			top: (-pan[5] + 16) / zoom,
			data: {
				isSaveExclude: true,
				ignoreSnapping: true,
				type: RULER_ELEMENTS.X_RULER_MARKER,
				id: generateId(),
			},
		});
		const text = new fabric.Text(`${i}`, {
			left: i - getAdjustedMarkerTextPosition(i) / zoom,
			top: -pan[5] / zoom,
			fontSize: 10 / zoom,
			strokeWidth: 2 / zoom,
			fill: colorScheme === 'dark' ? '#fff' : '#2c2c2c',
			fontFamily: 'Inter',
			selectable: false,
			hoverCursor: 'default',
			data: {
				isSaveExclude: true,
				ignoreSnapping: true,
				type: RULER_ELEMENTS.X_RULER_MARKER_TEXT,
				id: generateId(),
			},
		});

		canvasRef.current?.add(line, text);
	}
	const nearestTop = Math.round(top / interval) * interval;
	const canvasHeight = canvasRef.current?.height as number;
	for (let i = nearestTop; i < (canvasHeight + -pan[5]) / zoom; i += interval) {
		const line = new fabric.Line([0, i, 5 / zoom, i], {
			stroke: colorScheme === 'dark' ? '#fff' : '#2c2c2c',
			strokeWidth: 2 / zoom,
			top: i,
			selectable: false,
			hoverCursor: 'default',
			left: (-pan[4] + 16) / zoom,
			data: {
				isSaveExclude: true,
				ignoreSnapping: true,
				type: RULER_ELEMENTS.Y_RULER_MARKER,
				id: generateId(),
			},
		});
		const text = new fabric.Text(`${i}`, {
			top: i + getAdjustedMarkerTextPosition(i) / zoom,
			left: -pan[4] / zoom,
			fontSize: 10 / zoom,
			strokeWidth: 2 / zoom,
			fontFamily: 'Inter',
			fill: colorScheme === 'dark' ? '#fff' : '#2c2c2c',
			selectable: false,
			angle: 270,
			hoverCursor: 'default',
			data: {
				isSaveExclude: true,
				ignoreSnapping: true,
				type: RULER_ELEMENTS.Y_RULER_MARKER_TEXT,
				id: generateId(),
			},
		});
		canvasRef.current?.add(line, text);
	}
	const block = findBlock(canvasRef);
	block?.set({
		left: -pan[4] / zoom,
		top: -pan[5] / zoom,
		strokeWidth: 1 / zoom,
		width: 20 / zoom,
		height: 20 / zoom,
		stroke: colorScheme === 'dark' ? '#fff' : '#2c2c2c',
		fill: colorScheme === 'dark' ? '#2c2c2c' : '#fff',
	});
	block?.moveTo((canvasRef.current?.getObjects()?.length as number) - 1);
	block?.setCoords();
	canvasRef.current?.requestRenderAll();
}

export function renderRulerAxisBackground(
	canvasRef: React.MutableRefObject<fabric.Canvas | null>,
	colorScheme = 'light',
) {
	const zoom = canvasRef.current?.getZoom() as number;
	const xaxis = new fabric.Rect({
		left: 0,
		top: 0,
		fill: colorScheme === 'dark' ? '#2c2c2c' : '#fff',
		width: canvasRef.current?.width,
		height: 20,
		selectable: false,
		hoverCursor: 'default',
		stroke: colorScheme === 'dark' ? '#fff' : '#2c2c2c',
		strokeWidth: 1 / zoom,
		data: {
			ignoreSnapping: true,
			isSaveExclude: true,
			id: generateId(),
			type: RULER_ELEMENTS.X_RULER_BACKGROUND,
		},
	});
	const yaxis = new fabric.Rect({
		left: 0,
		top: 0,
		fill: colorScheme === 'dark' ? '#2c2c2c' : '#fff',
		width: 20,
		selectable: false,
		hoverCursor: 'default',
		height: canvasRef.current?.height,
		stroke: colorScheme === 'dark' ? '#fff' : '#2c2c2c',
		strokeWidth: 1 / zoom,
		data: {
			id: generateId(),
			type: RULER_ELEMENTS.Y_RULER_BACKGROUND,
			ignoreSnapping: true,
			isSaveExclude: true,
		},
	});
	const block = new fabric.Rect({
		left: 0,
		top: 0,
		fill: colorScheme === 'dark' ? '#2c2c2c' : '#fff',
		width: 20 / zoom,
		selectable: false,
		height: 20 / zoom,
		hoverCursor: 'default',
		stroke: colorScheme === 'dark' ? '#fff' : '#2c2c2c',
		strokeWidth: 1 / zoom,
		data: {
			id: generateId(),
			type: RULER_ELEMENTS.BLOCK,
			ignoreSnapping: true,
			isSaveExclude: true,
		},
	});
	canvasRef.current
		?.getObjects()
		.filter(item =>
			[RULER_ELEMENTS.X_RULER_BACKGROUND, RULER_ELEMENTS.Y_RULER_BACKGROUND, RULER_ELEMENTS.BLOCK].includes(
				item.data?.type,
			),
		)
		.forEach(item => {
			canvasRef.current?.remove(item);
		});
	canvasRef.current?.add(xaxis, yaxis, block);
	canvasRef.current?.requestRenderAll();
}

export function adjustRulerLinesPosition(canvasRef: React.MutableRefObject<fabric.Canvas | null>) {
	const allObjects = canvasRef?.current?.getObjects() as fabric.Object[];
	const zoom = canvasRef.current?.getZoom() as number;
	const canvasHeight = canvasRef.current?.height as number;
	const canvasWidth = canvasRef.current?.width as number;
	allObjects
		.filter(x => x.data.type === RULER_LINES.X_RULER_LINE)
		.forEach(x => {
			const pan = canvasRef.current?.viewportTransform as FixedArray<number, 6>;
			x?.set({
				strokeWidth: 2 / zoom,
				top: (-pan[5] + 20) / zoom,
				height: canvasHeight / zoom,
				padding: 10 / zoom,
				width: 0,
			});
			x.setCoords();
		});

	allObjects
		.filter(x => x.data.type === RULER_LINES.Y_RULER_LINE)
		.forEach(x => {
			const pan = canvasRef.current?.viewportTransform as unknown as fabric.IPoint[];
			x?.set({
				strokeWidth: 2 / zoom,
				left: (-pan[4] + 20) / zoom,
				width: canvasWidth / zoom,
				padding: 10 / zoom,
				height: 0,
			});
			x.setCoords();
		});
}

export function removeRulerOnMoveMarker(canvasRef: React.MutableRefObject<fabric.Canvas | null>) {
	canvasRef.current
		?.getObjects()
		.filter(item => [RULER_ELEMENTS.X_ON_MOVE_MARKER, RULER_ELEMENTS.Y_ON_MOVE_MARKER].includes(item.data?.type))
		.forEach(item => {
			canvasRef.current?.remove(item);
		});
}

export function findXAxis(canvasRef: React.MutableRefObject<fabric.Canvas | null>) {
	return canvasRef.current?.getObjects().find(x => x.data.type === RULER_ELEMENTS.X_RULER_BACKGROUND);
}

export function findYAxis(canvasRef: React.MutableRefObject<fabric.Canvas | null>) {
	return canvasRef.current?.getObjects().find(x => x.data.type === RULER_ELEMENTS.Y_RULER_BACKGROUND);
}

export function findBlock(canvasRef: React.MutableRefObject<fabric.Canvas | null>) {
	return canvasRef.current?.getObjects().find(x => x.data.type === RULER_ELEMENTS.BLOCK);
}

export function adjustRulerBackgroundPosition(
	canvasRef: React.MutableRefObject<fabric.Canvas | null>,
	colorScheme = 'light',
) {
	const xaxis = findXAxis(canvasRef);
	const yaxis = findYAxis(canvasRef);
	const block = findBlock(canvasRef);
	const pan = canvasRef.current?.viewportTransform as FixedArray<number, 6>;
	const zoom = canvasRef.current?.getZoom() as number;
	const canvasWidth = canvasRef.current?.width as number;
	const canvasHeight = canvasRef.current?.height as number;
	xaxis?.set({
		left: -pan[4] / zoom,
		top: -pan[5] / zoom,
		strokeWidth: 1 / zoom,
		fill: colorScheme === 'dark' ? '#2c2c2c' : '#fff',
		stroke: colorScheme === 'dark' ? '#fff' : '#2c2c2c',
		width: canvasWidth / zoom,
		height: 20 / zoom,
	});
	yaxis?.set({
		left: -pan[4] / zoom,
		top: -pan[5] / zoom,
		strokeWidth: 1 / zoom,
		width: 20 / zoom,
		stroke: colorScheme === 'dark' ? '#fff' : '#2c2c2c',
		fill: colorScheme === 'dark' ? '#2c2c2c' : '#fff',
		height: canvasHeight / zoom,
	});
	xaxis?.moveTo((canvasRef.current?.getObjects()?.length as number) + 1);
	yaxis?.moveTo((canvasRef.current?.getObjects()?.length as number) + 2);
	block?.moveTo((canvasRef.current?.getObjects()?.length as number) + 3);
	xaxis?.setCoords();
	yaxis?.setCoords();
}

export function removeRuler(canvasRef: React.MutableRefObject<fabric.Canvas | null>) {
	canvasRef.current
		?.getObjects()
		.filter(x => [...Object.values(RULER_LINES), ...Object.values(RULER_ELEMENTS)].includes(x.data?.type))
		.forEach(x => {
			canvasRef.current?.remove(x);
		});
	canvasRef.current?.renderAll();
}

export function loadRulerLines(canvasRef: React.MutableRefObject<fabric.Canvas | null>, id: string) {
	const rulerLines = readRulerDataFromStorage();
	const currentArtboardRuler = rulerLines?.[id];
	if (!currentArtboardRuler) return;
	const zoom = canvasRef.current?.getZoom() as number;
	const pan = canvasRef.current?.viewportTransform as FixedArray<number, 6>;
	const canvasHeight =
		zoom > 1 ? (canvasRef.current?.height as number) : (canvasRef.current?.height as number) / zoom;
	const canvasWidth = zoom > 1 ? (canvasRef.current?.width as number) : (canvasRef.current?.width as number) / zoom;
	currentArtboardRuler.forEach((item: fabric.Object) => {
		const axis = item?.data?.type === RULER_LINES.X_RULER_LINE ? 'x' : 'y';
		const points =
			axis === 'x'
				? [item.left, (-pan[5] + 20) / zoom, item.left, canvasHeight]
				: [(-pan[4] + 20) / zoom, item.top, canvasWidth, item.top];
		const line = new fabric.Line(points as number[], {
			stroke: '#000',
			strokeWidth: 2 / zoom,
			hasControls: false,
			hasBorders: false,
			lockRotation: true,
			lockScalingX: true,
			lockScalingY: true,
			lockUniScaling: true,
			lockSkewingX: true,
			lockSkewingY: true,
			lockScalingFlip: true,
			...(axis === 'x' ? { lockMovementY: true } : { lockMovementX: true }),
			data: {
				isSaveExclude: true,
				type: item.data.type,
				id: item.data.id,
			},
		});
		line.bringToFront();
		line.setCoords();
		canvasRef.current?.add(line);
		canvasRef.current?.renderAll();
	});
}

export function initializeRuler(
	canvasRef: React.MutableRefObject<fabric.Canvas | null>,
	colorScheme = 'light',
	artboardID: string,
) {
	renderRulerAxisBackground(canvasRef, colorScheme);
	adjustRulerBackgroundPosition(canvasRef, colorScheme);
	adjustRulerLinesPosition(canvasRef);
	renderRulerStepMarkers(canvasRef, colorScheme);
	loadRulerLines(canvasRef, artboardID);
	canvasRef.current?.requestRenderAll();
}

export function deleteRulerLines(canvasRef: React.MutableRefObject<fabric.Canvas | null>, ids: string[] = []) {
	const json = canvasRef.current?.toJSON(FABRIC_JSON_ALLOWED_KEYS);
	const rulerLines = json?.objects.filter((x: fabric.Object) => Object.values(RULER_LINES).includes(x.data?.type));
	localStorage.setItem('ruler', JSON.stringify(rulerLines?.filter((x: fabric.Object) => !ids.includes(x.data?.id))));
}

export function addNewRulerLine(
	options: fabric.IEvent,
	canvasRef: React.MutableRefObject<fabric.Canvas | null>,
	id: string,
) {
	// create vertical line
	if (
		[RULER_ELEMENTS.X_RULER_BACKGROUND, RULER_ELEMENTS.X_RULER_MARKER, RULER_ELEMENTS.X_RULER_MARKER_TEXT].includes(
			options?.target?.data?.type,
		)
	) {
		const zoom = canvasRef.current?.getZoom() as number;
		const pointer = canvasRef.current?.getPointer(options.e) as { x: number; y: number };
		const canvasHeight =
			zoom > 1 ? (canvasRef.current?.height as number) : (canvasRef.current?.height as number) / zoom;
		const pan = canvasRef.current?.viewportTransform as unknown as fabric.IPoint[];
		const line = new fabric.Line([pointer.x, (-pan[5] + 20) / zoom, pointer.x, canvasHeight], {
			stroke: '#000',
			strokeWidth: 2 / zoom,
			hasControls: false,
			hasBorders: false,
			lockRotation: true,
			lockMovementY: true,
			lockScalingX: true,
			lockScalingY: true,
			lockUniScaling: true,
			lockSkewingX: true,
			lockSkewingY: true,
			lockScalingFlip: true,
			data: {
				type: RULER_LINES.X_RULER_LINE,
				id: generateId(),
				isSaveExclude: true,
			},
		});
		line.bringToFront();
		line.set({ height: canvasHeight, width: 0 });
		line.setCoords();
		canvasRef.current?.add(line);
		canvasRef.current?.renderAll();
		// create horizontal line
	} else if (
		[RULER_ELEMENTS.Y_RULER_BACKGROUND, RULER_ELEMENTS.Y_RULER_MARKER, RULER_ELEMENTS.Y_RULER_MARKER_TEXT].includes(
			options?.target?.data?.type,
		)
	) {
		const zoom = canvasRef.current?.getZoom() as number;
		const pointer = canvasRef.current?.getPointer(options.e) as { x: number; y: number };
		const canvasWidth =
			zoom > 1 ? (canvasRef.current?.width as number) : (canvasRef.current?.width as number) / zoom;
		const pan = canvasRef.current?.viewportTransform as unknown as fabric.IPoint[];
		const line = new fabric.Line([(-pan[4] + 20) / zoom, pointer.y, canvasWidth, pointer.y], {
			stroke: '#000',
			strokeWidth: 2 / zoom,
			lockMovementX: true,
			hasControls: false,
			lockRotation: true,
			lockScalingX: true,
			lockScalingY: true,
			hasBorders: false,
			lockUniScaling: true,
			lockSkewingX: true,
			lockSkewingY: true,
			lockScalingFlip: true,
			data: {
				isSaveExclude: true,
				type: RULER_LINES.Y_RULER_LINE,
				id: generateId(),
			},
		});
		line.bringToFront();
		line.set({ width: canvasWidth, height: 0 });
		line.setCoords();
		canvasRef.current?.add(line);
		canvasRef.current?.requestRenderAll();
		// change color of selected ruler line
	} else if (Object.values(RULER_LINES).includes(options?.target?.data?.type)) {
		options.target?.set({ fill: 'red', stroke: 'red' });
		renderRulerOnMoveMarker(options.target!, canvasRef);
	}
	const json = canvasRef.current?.toJSON(FABRIC_JSON_ALLOWED_KEYS);
	const rulerLines = json?.objects.filter((x: fabric.Object) => Object.values(RULER_LINES).includes(x.data?.type));
	const parsedState = readRulerDataFromStorage();
	localStorage.setItem('ruler', JSON.stringify({ ...parsedState, [id]: rulerLines }));
}

export function renderRulerOnMoveMarker(
	target: fabric.Object,
	canvasRef: React.MutableRefObject<fabric.Canvas | null>,
) {
	if (RULER_LINES.X_RULER_LINE === target.data?.type) {
		removeRulerOnMoveMarker(canvasRef);
		const pan = canvasRef.current?.viewportTransform as FixedArray<number, 6>;
		const zoom = canvasRef.current?.getZoom() as number;
		canvasRef.current?.add(
			new fabric.Text(`${Math.round(target.left as number)}`, {
				left: (target.left as number) + 5 / zoom,
				top: (-pan[5] + 20) / zoom,
				fill: 'red',
				fontFamily: 'Inter',
				fontSize: 12 / zoom,
				data: { type: RULER_ELEMENTS.X_ON_MOVE_MARKER, id: generateId(), isSaveExclude: true },
			}),
		);
	} else if (RULER_LINES.Y_RULER_LINE === target.data?.type) {
		removeRulerOnMoveMarker(canvasRef);
		const pan = canvasRef.current?.viewportTransform as FixedArray<number, 6>;
		const zoom = canvasRef.current?.getZoom() as number;
		canvasRef.current?.add(
			new fabric.Text(`${Math.round(target.top as number)}`, {
				left: (-pan[4] + 20) / zoom,
				top: (target.top as number) - 5 / zoom,
				fill: 'red',
				fontFamily: 'Inter',
				angle: 270,
				fontSize: 12 / zoom,
				data: { type: RULER_ELEMENTS.Y_ON_MOVE_MARKER, id: generateId(), isSaveExclude: true },
			}),
		);
	}
}

export function readRulerDataFromStorage() {
	const rulerLinesFromStroage = localStorage.getItem('ruler');
	const parsedState = JSON.parse(rulerLinesFromStroage || '{}');
	return parsedState;
}

export function updateRulerLineInStorage(id: string, rulerLines: fabric.Object[]) {
	const parsedState = readRulerDataFromStorage();
	localStorage.setItem('ruler', JSON.stringify({ ...parsedState, [id]: rulerLines }));
}

export function deleteRulerLineForArtboard(id: string) {
	const parsedState = readRulerDataFromStorage();
	delete parsedState[id];
	localStorage.setItem('ruler', JSON.stringify(parsedState));
}
