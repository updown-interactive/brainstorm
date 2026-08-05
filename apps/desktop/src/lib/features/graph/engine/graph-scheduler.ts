export const enum GraphDirtyFlag {
	Camera = 1 << 0,
	Graph = 1 << 1,
	Layout = 1 << 2,
	Hover = 1 << 3,
	Selection = 1 << 4,
	Labels = 1 << 5,
	Settings = 1 << 6
}

export class GraphRenderScheduler {
	private frame = 0;
	private queued = false;
	private dirtyFlags = 0;

	constructor(private readonly render: (dirtyFlags: number) => void) {}

	request(flag = GraphDirtyFlag.Graph): void {
		if (typeof requestAnimationFrame === 'undefined') return;
		this.dirtyFlags |= flag;
		if (this.queued) return;
		this.queued = true;
		this.frame = requestAnimationFrame(() => {
			const dirtyFlags = this.dirtyFlags;
			this.queued = false;
			this.frame = 0;
			this.dirtyFlags = 0;
			this.render(dirtyFlags);
		});
	}

	cancel(): void {
		if (typeof cancelAnimationFrame === 'undefined') return;
		if (this.frame) cancelAnimationFrame(this.frame);
		this.frame = 0;
		this.queued = false;
		this.dirtyFlags = 0;
	}
}