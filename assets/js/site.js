(() => {
	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	// Nav: scrolled state, mobile toggle, active section
	const nav = document.getElementById("nav");
	const toggle = document.getElementById("navToggle");
	const links = document.getElementById("navLinks");
	const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 20);
	window.addEventListener("scroll", onScroll, { passive: true });
	onScroll();

	toggle.addEventListener("click", () => {
		const open = links.classList.toggle("is-open");
		toggle.setAttribute("aria-expanded", String(open));
	});
	links.querySelectorAll("a").forEach((a) =>
		a.addEventListener("click", () => {
			links.classList.remove("is-open");
			toggle.setAttribute("aria-expanded", "false");
		})
	);

	const navItems = [...links.querySelectorAll('a[href^="#"]')]
		.map((a) => ({ a, el: document.getElementById(a.getAttribute("href").slice(1)) }))
		.filter((n) => n.el);
	const updateActive = () => {
		const line = window.innerHeight * 0.4;
		let current = null;
		navItems.forEach((n) => { if (n.el.getBoundingClientRect().top <= line) current = n; });
		navItems.forEach((n) => n.a.classList.toggle("is-active", n === current));
	};
	window.addEventListener("scroll", updateActive, { passive: true });
	updateActive();

	// Reveal on scroll
	const revealObserver = new IntersectionObserver(
		(entries) => {
			entries.forEach((e) => {
				if (e.isIntersecting) {
					e.target.classList.add("is-visible");
					revealObserver.unobserve(e.target);
				}
			});
		},
		{ threshold: 0.12 }
	);
	document.querySelectorAll(".reveal").forEach((el, i) => {
		el.style.transitionDelay = `${(i % 4) * 70}ms`;
		revealObserver.observe(el);
	});

	// Count-up stats
	const countObserver = new IntersectionObserver(
		(entries) => {
			entries.forEach((e) => {
				if (!e.isIntersecting) return;
				const el = e.target;
				const target = Number(el.dataset.count);
				const start = performance.now();
				const dur = reduceMotion ? 0 : 1600;
				const step = (now) => {
					const t = dur ? Math.min((now - start) / dur, 1) : 1;
					el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
					if (t < 1) requestAnimationFrame(step);
				};
				requestAnimationFrame(step);
				countObserver.unobserve(el);
			});
		},
		{ threshold: 0.6 }
	);
	document.querySelectorAll("[data-count]").forEach((el) => countObserver.observe(el));

	// Typed roles
	const typed = document.getElementById("typed");
	const roles = [
		"GPU-accelerated Physical AI simulation",
		"agentic AI pipelines for sim-ready models",
		"real-time plant models for HIL/SIL",
		"virtual sensors for autonomy validation",
	];
	if (!reduceMotion) {
		let r = 0, c = roles[0].length, deleting = true;
		const tick = () => {
			const word = roles[r];
			c += deleting ? -1 : 1;
			typed.textContent = word.slice(0, c);
			let delay = deleting ? 28 : 55;
			if (!deleting && c === word.length) { deleting = true; delay = 2200; }
			else if (deleting && c === 0) { deleting = false; r = (r + 1) % roles.length; delay = 300; }
			setTimeout(tick, delay);
		};
		setTimeout(tick, 2600);
	}

	// Project filters
	const filters = document.querySelectorAll(".filter");
	const projects = document.querySelectorAll(".project");
	filters.forEach((btn) =>
		btn.addEventListener("click", () => {
			filters.forEach((b) => b.classList.remove("is-active"));
			btn.classList.add("is-active");
			const f = btn.dataset.filter;
			projects.forEach((p) => {
				const show = f === "all" || p.dataset.cat === f;
				p.classList.toggle("is-hidden", !show);
				if (show) p.classList.add("is-visible");
			});
		})
	);

	// Video modal (YouTube iframe only loads on demand)
	const modal = document.getElementById("videoModal");
	const frame = document.getElementById("videoFrame");
	const idPattern = /^[A-Za-z0-9_-]{6,20}$/;
	const openVideo = (id) => {
		if (!idPattern.test(id)) return;
		const iframe = document.createElement("iframe");
		iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
		iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
		iframe.title = "Project video";
		frame.replaceChildren(iframe);
		modal.classList.add("is-open");
		modal.setAttribute("aria-hidden", "false");
		document.body.style.overflow = "hidden";
	};
	const closeVideo = () => {
		modal.classList.remove("is-open");
		modal.setAttribute("aria-hidden", "true");
		document.body.style.overflow = "";
		setTimeout(() => frame.replaceChildren(), 300);
	};
	document.querySelectorAll("[data-video]").forEach((el) =>
		el.addEventListener("click", () => openVideo(el.dataset.video))
	);
	modal.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeVideo));
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape" && modal.classList.contains("is-open")) closeVideo();
	});

	document.getElementById("year").textContent = new Date().getFullYear();

	// Hero canvas: animated wireframe terrain
	const canvas = document.getElementById("heroCanvas");
	const ctx = canvas.getContext("2d");
	const COLS = 56, ROWS = 34;
	let w, h, dpr, running = true, t = 0;

	const resize = () => {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		w = canvas.clientWidth;
		h = canvas.clientHeight;
		canvas.width = w * dpr;
		canvas.height = h * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	};

	const height = (x, z, time) =>
		Math.sin(x * 0.35 + time * 0.6) * 0.9 +
		Math.cos(z * 0.28 - time * 0.4) * 1.1 +
		Math.sin((x + z) * 0.18 + time * 0.3) * 1.4;

	const project = (x, y, z) => {
		const fov = h * 1.1;
		const cz = z + 6;
		return [w / 2 + (x * fov) / cz, h * 0.42 - ((y - 3.2) * fov) / cz];
	};

	const draw = () => {
		ctx.clearRect(0, 0, w, h);
		const pts = [];
		for (let j = 0; j < ROWS; j++) {
			const row = [];
			const z = j * 0.9;
			for (let i = 0; i < COLS; i++) {
				const x = (i - COLS / 2) * 0.9;
				row.push(project(x, height(i, j, t) * 0.55, z));
			}
			pts.push(row);
		}
		for (let j = ROWS - 1; j >= 0; j--) {
			const depth = 1 - j / ROWS;
			const alpha = Math.pow(depth, 1.6) * 0.55;
			const mix = j / ROWS;
			const r = Math.round(255 * (1 - mix) + 56 * mix);
			const g = Math.round(205 * (1 - mix) + 189 * mix);
			const b = Math.round(17 * (1 - mix) + 248 * mix);
			ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
			ctx.lineWidth = 1;
			ctx.beginPath();
			pts[j].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
			ctx.stroke();
			if (j % 3 === 0) {
				ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 1.4})`;
				for (let i = 0; i < COLS; i += 3) {
					const [x, y] = pts[j][i];
					ctx.fillRect(x - 1, y - 1, 2, 2);
				}
			}
		}
		ctx.strokeStyle = "rgba(255,255,255,0.05)";
		for (let i = 0; i < COLS; i += 2) {
			ctx.beginPath();
			for (let j = 0; j < ROWS; j++) {
				const [x, y] = pts[j][i];
				j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
			}
			ctx.stroke();
		}
	};

	const loop = () => {
		if (!running) return;
		t += 0.012;
		draw();
		requestAnimationFrame(loop);
	};

	resize();
	window.addEventListener("resize", resize);
	if (reduceMotion) {
		draw();
	} else {
		new IntersectionObserver(([e]) => {
			const wasRunning = running;
			running = e.isIntersecting;
			if (running && !wasRunning) loop();
		}).observe(canvas);
		loop();
	}
})();
