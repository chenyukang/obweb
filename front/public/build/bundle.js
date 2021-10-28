
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }
    class HtmlTag {
        constructor() {
            this.e = this.n = null;
        }
        c(html) {
            this.h(html);
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.c(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Login.svelte generated by Svelte v3.44.0 */

    const { console: console_1$5 } = globals;
    const file$4 = "src/Login.svelte";

    function create_fragment$5(ctx) {
    	let div8;
    	let div7;
    	let div6;
    	let div0;
    	let button0;
    	let span;
    	let t1;
    	let div5;
    	let div1;
    	let h4;
    	let t3;
    	let div4;
    	let form;
    	let div2;
    	let input0;
    	let t4;
    	let div3;
    	let input1;
    	let t5;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div8 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			span = element("span");
    			span.textContent = "×";
    			t1 = space();
    			div5 = element("div");
    			div1 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Login";
    			t3 = space();
    			div4 = element("div");
    			form = element("form");
    			div2 = element("div");
    			input0 = element("input");
    			t4 = space();
    			div3 = element("div");
    			input1 = element("input");
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = "Login";
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$4, 88, 20, 2397);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "close");
    			attr_dev(button0, "data-dismiss", "modal");
    			attr_dev(button0, "aria-label", "Close");
    			add_location(button0, file$4, 82, 16, 2203);
    			attr_dev(div0, "class", "modal-header border-bottom-0");
    			add_location(div0, file$4, 81, 12, 2144);
    			add_location(h4, file$4, 93, 20, 2592);
    			attr_dev(div1, "class", "form-title text-center");
    			add_location(div1, file$4, 92, 16, 2535);
    			attr_dev(input0, "type", "username");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "placeholder", "Username");
    			add_location(input0, file$4, 98, 28, 2795);
    			attr_dev(div2, "class", "form-group");
    			add_location(div2, file$4, 97, 24, 2742);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "placeholder", "Password");
    			add_location(input1, file$4, 106, 28, 3151);
    			attr_dev(div3, "class", "form-group");
    			add_location(div3, file$4, 105, 24, 3098);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-info btn-block btn-round");
    			attr_dev(button1, "id", "loginBtn");
    			add_location(button1, file$4, 113, 24, 3454);
    			add_location(form, file$4, 96, 20, 2711);
    			attr_dev(div4, "class", "d-flex flex-column text-center");
    			add_location(div4, file$4, 95, 16, 2646);
    			attr_dev(div5, "class", "modal-body");
    			add_location(div5, file$4, 91, 12, 2494);
    			attr_dev(div6, "class", "modal-content");
    			add_location(div6, file$4, 80, 8, 2104);
    			attr_dev(div7, "class", "modal-dialog modal-dialog-centered");
    			attr_dev(div7, "role", "document");
    			add_location(div7, file$4, 79, 4, 2031);
    			attr_dev(div8, "class", "modal fade");
    			attr_dev(div8, "id", "loginModal");
    			attr_dev(div8, "tabindex", "-1");
    			attr_dev(div8, "role", "dialog");
    			attr_dev(div8, "aria-labelledby", "exampleModalLabel");
    			attr_dev(div8, "aria-hidden", "true");
    			add_location(div8, file$4, 71, 0, 1878);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div0);
    			append_dev(div0, button0);
    			append_dev(button0, span);
    			append_dev(div6, t1);
    			append_dev(div6, div5);
    			append_dev(div5, div1);
    			append_dev(div1, h4);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div4, form);
    			append_dev(form, div2);
    			append_dev(div2, input0);
    			set_input_value(input0, /*username*/ ctx[0]);
    			append_dev(form, t4);
    			append_dev(form, div3);
    			append_dev(div3, input1);
    			set_input_value(input1, /*password*/ ctx[1]);
    			append_dev(form, t5);
    			append_dev(form, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[3]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[4]),
    					listen_dev(button1, "click", /*handleLogin*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*username*/ 1) {
    				set_input_value(input0, /*username*/ ctx[0]);
    			}

    			if (dirty & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
    				set_input_value(input1, /*password*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div8);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Login', slots, []);
    	const jq = window.$;
    	let username = "";
    	let password = "";

    	onMount(async () => {
    		
    	}); //tryLogin();

    	// Try to verify token in cookie,
    	// if it's not valid we need to show up login modal
    	function tryLogin(callback = null) {
    		jq.ajax({
    			url: "/api/verify",
    			type: "GET",
    			success(response) {
    				if (response != "failed") {
    					jq("#loginModal").modal("hide");
    				} else {
    					showLoginModal();
    				}

    				if (callback != null) {
    					callback();
    				}
    			},
    			error(err) {
    				console.log("TryLogin error: ", err);
    				showLoginModal();
    			}
    		});
    	}

    	function showLoginModal(init = false) {
    		if (jq("#loginModal").length == 0) {
    			window.location.href = "/obweb";
    		}

    		jq("#loginModal").modal("show");

    		if (init) {
    			jq("#loginBtn").text("Initialize Account");
    		}
    	}

    	function handleLogin() {
    		let data = JSON.stringify({ username, password });
    		console.log(data);

    		jq.ajax({
    			url: "/api/login",
    			type: "POST",
    			datatype: "json",
    			contentType: "Application/json",
    			data,
    			success(response) {
    				if (response != "failed") {
    					jq("#loginModal").modal("hide");
    				}
    			},
    			error(err) {
    				console.log("There was an error when login: ", err);
    			}
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$5.warn(`<Login> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		username = this.value;
    		$$invalidate(0, username);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(1, password);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		jq,
    		username,
    		password,
    		tryLogin,
    		showLoginModal,
    		handleLogin
    	});

    	$$self.$inject_state = $$props => {
    		if ('username' in $$props) $$invalidate(0, username = $$props.username);
    		if ('password' in $$props) $$invalidate(1, password = $$props.password);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [username, password, handleLogin, input0_input_handler, input1_input_handler];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/Nav.svelte generated by Svelte v3.44.0 */

    const { console: console_1$4 } = globals;
    const file$3 = "src/Nav.svelte";

    function create_fragment$4(ctx) {
    	let nav;
    	let div0;
    	let a;
    	let t1;
    	let div1;
    	let button0;
    	let t3;
    	let button1;
    	let t5;
    	let button2;
    	let t7;
    	let button3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div0 = element("div");
    			a = element("a");
    			a.textContent = "Obweb";
    			t1 = space();
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "Day";
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "Find";
    			t5 = space();
    			button2 = element("button");
    			button2.textContent = "Rand";
    			t7 = space();
    			button3 = element("button");
    			button3.textContent = "Todo";
    			attr_dev(a, "class", "navbar-brand");
    			attr_dev(a, "href", "/");
    			add_location(a, file$3, 21, 8, 562);
    			add_location(div0, file$3, 20, 4, 548);
    			attr_dev(button0, "class", "btn btn-primary btn-sm");
    			add_location(button0, file$3, 25, 8, 677);
    			attr_dev(button1, "class", "btn btn-success btn-sm");
    			add_location(button1, file$3, 26, 8, 758);
    			attr_dev(button2, "class", "btn btn-secondary btn-sm");
    			add_location(button2, file$3, 28, 8, 849);
    			attr_dev(button3, "class", "btn btn-info btn-sm");
    			add_location(button3, file$3, 31, 8, 955);
    			set_style(div1, "float", "right");
    			add_location(div1, file$3, 24, 4, 642);
    			attr_dev(nav, "class", "navbar navbar-light");
    			set_style(nav, "background-color", "#e3f2fd");
    			add_location(nav, file$3, 19, 0, 475);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div0);
    			append_dev(div0, a);
    			append_dev(nav, t1);
    			append_dev(nav, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t3);
    			append_dev(div1, button1);
    			append_dev(div1, t5);
    			append_dev(div1, button2);
    			append_dev(div1, t7);
    			append_dev(div1, button3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(a, "click", /*handleNav*/ ctx[0], false, false, false),
    					listen_dev(button0, "click", /*handleNav*/ ctx[0], false, false, false),
    					listen_dev(button1, "click", /*handleNav*/ ctx[0], false, false, false),
    					listen_dev(button2, "click", /*handleNav*/ ctx[0], false, false, false),
    					listen_dev(button3, "click", /*handleNav*/ ctx[0], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Nav', slots, []);
    	const jq = window.$;
    	let cur_page;
    	const dispatch = createEventDispatcher();

    	function handleNav(event) {
    		event.preventDefault();
    		let page = event.target.innerText.toLowerCase();
    		cur_page = page;

    		if (cur_page == "obweb") {
    			cur_page = "index";
    		}

    		dispatch('message', cur_page);
    		console.log("dispatched ....");
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$4.warn(`<Nav> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		jq,
    		cur_page,
    		dispatch,
    		handleNav
    	});

    	$$self.$inject_state = $$props => {
    		if ('cur_page' in $$props) cur_page = $$props.cur_page;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [handleNav];
    }

    class Nav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nav",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* node_modules/svelte-tags-input/src/Tags.svelte generated by Svelte v3.44.0 */

    const { console: console_1$3 } = globals;
    const file$2 = "node_modules/svelte-tags-input/src/Tags.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[39] = list[i];
    	child_ctx[41] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	child_ctx[43] = i;
    	return child_ctx;
    }

    // (319:4) {#if tags.length > 0}
    function create_if_block_1$2(ctx) {
    	let each_1_anchor;
    	let each_value_1 = /*tags*/ ctx[0];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*removeTag, disable, tags, autoCompleteKey*/ 8265) {
    				each_value_1 = /*tags*/ ctx[0];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(319:4) {#if tags.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (324:16) {:else}
    function create_else_block$1(ctx) {
    	let t_value = /*tag*/ ctx[10][/*autoCompleteKey*/ ctx[3]] + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*tags, autoCompleteKey*/ 9 && t_value !== (t_value = /*tag*/ ctx[10][/*autoCompleteKey*/ ctx[3]] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(324:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (322:16) {#if typeof tag === 'string'}
    function create_if_block_3$2(ctx) {
    	let t_value = /*tag*/ ctx[10] + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*tags*/ 1 && t_value !== (t_value = /*tag*/ ctx[10] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$2.name,
    		type: "if",
    		source: "(322:16) {#if typeof tag === 'string'}",
    		ctx
    	});

    	return block;
    }

    // (327:16) {#if !disable}
    function create_if_block_2$2(ctx) {
    	let span;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[29](/*i*/ ctx[43]);
    	}

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "×";
    			attr_dev(span, "class", "svelte-tags-input-tag-remove svelte-1hda3m");
    			add_location(span, file$2, 327, 16, 9571);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);

    			if (!mounted) {
    				dispose = listen_dev(span, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(327:16) {#if !disable}",
    		ctx
    	});

    	return block;
    }

    // (320:8) {#each tags as tag, i}
    function create_each_block_1(ctx) {
    	let span;
    	let t0;
    	let t1;

    	function select_block_type(ctx, dirty) {
    		if (typeof /*tag*/ ctx[10] === 'string') return create_if_block_3$2;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = !/*disable*/ ctx[6] && create_if_block_2$2(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			attr_dev(span, "class", "svelte-tags-input-tag svelte-1hda3m");
    			add_location(span, file$2, 320, 12, 9319);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			if_block0.m(span, null);
    			append_dev(span, t0);
    			if (if_block1) if_block1.m(span, null);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(span, t0);
    				}
    			}

    			if (!/*disable*/ ctx[6]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2$2(ctx);
    					if_block1.c();
    					if_block1.m(span, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(320:8) {#each tags as tag, i}",
    		ctx
    	});

    	return block;
    }

    // (349:0) {#if autoComplete && arrelementsmatch.length > 0}
    function create_if_block$3(ctx) {
    	let div;
    	let ul;
    	let ul_id_value;
    	let each_value = /*arrelementsmatch*/ ctx[9];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(ul, "id", ul_id_value = "" + (/*id*/ ctx[5] + "_matchs"));
    			attr_dev(ul, "class", "svelte-tags-input-matchs svelte-1hda3m");
    			add_location(ul, file$2, 350, 8, 10211);
    			attr_dev(div, "class", "svelte-tags-input-matchs-parent svelte-1hda3m");
    			add_location(div, file$2, 349, 4, 10156);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*navigateAutoComplete, arrelementsmatch, addTag*/ 266752) {
    				each_value = /*arrelementsmatch*/ ctx[9];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*id*/ 32 && ul_id_value !== (ul_id_value = "" + (/*id*/ ctx[5] + "_matchs"))) {
    				attr_dev(ul, "id", ul_id_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(349:0) {#if autoComplete && arrelementsmatch.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (352:12) {#each arrelementsmatch as element, index}
    function create_each_block(ctx) {
    	let li;
    	let html_tag;
    	let raw_value = /*element*/ ctx[39].search + "";
    	let t;
    	let mounted;
    	let dispose;

    	function keydown_handler() {
    		return /*keydown_handler*/ ctx[32](/*index*/ ctx[41], /*element*/ ctx[39]);
    	}

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[33](/*element*/ ctx[39]);
    	}

    	const block = {
    		c: function create() {
    			li = element("li");
    			html_tag = new HtmlTag();
    			t = space();
    			html_tag.a = t;
    			attr_dev(li, "tabindex", "-1");
    			attr_dev(li, "class", "svelte-1hda3m");
    			add_location(li, file$2, 352, 16, 10339);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			html_tag.m(raw_value, li);
    			append_dev(li, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(li, "keydown", keydown_handler, false, false, false),
    					listen_dev(li, "click", click_handler_1, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*arrelementsmatch*/ 512 && raw_value !== (raw_value = /*element*/ ctx[39].search + "")) html_tag.p(raw_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(352:12) {#each arrelementsmatch as element, index}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let label;
    	let t0;
    	let label_class_value;
    	let t1;
    	let t2;
    	let input;
    	let t3;
    	let if_block1_anchor;
    	let mounted;
    	let dispose;
    	let if_block0 = /*tags*/ ctx[0].length > 0 && create_if_block_1$2(ctx);
    	let if_block1 = /*autoComplete*/ ctx[2] && /*arrelementsmatch*/ ctx[9].length > 0 && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			label = element("label");
    			t0 = text(/*labelText*/ ctx[7]);
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			attr_dev(label, "for", /*id*/ ctx[5]);
    			attr_dev(label, "class", label_class_value = "" + (null_to_empty(/*labelShow*/ ctx[8] ? "" : "sr-only") + " svelte-1hda3m"));
    			add_location(label, file$2, 316, 4, 9174);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "name", /*name*/ ctx[4]);
    			attr_dev(input, "placeholder", /*placeholder*/ ctx[1]);
    			attr_dev(input, "id", /*id*/ ctx[5]);
    			attr_dev(input, "class", "svelte-tags-input svelte-1hda3m");
    			input.disabled = /*disable*/ ctx[6];
    			add_location(input, file$2, 332, 4, 9736);
    			attr_dev(div, "class", "svelte-tags-input-layout svelte-1hda3m");
    			toggle_class(div, "sti-layout-disable", /*disable*/ ctx[6]);
    			add_location(div, file$2, 315, 0, 9095);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label);
    			append_dev(label, t0);
    			append_dev(div, t1);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t2);
    			append_dev(div, input);
    			set_input_value(input, /*tag*/ ctx[10]);
    			insert_dev(target, t3, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[30]),
    					listen_dev(input, "keydown", /*setTag*/ ctx[11], false, false, false),
    					listen_dev(input, "keyup", /*getMatchElements*/ ctx[17], false, false, false),
    					listen_dev(input, "paste", /*onPaste*/ ctx[14], false, false, false),
    					listen_dev(input, "drop", /*onDrop*/ ctx[15], false, false, false),
    					listen_dev(input, "blur", /*blur_handler*/ ctx[31], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*labelText*/ 128) set_data_dev(t0, /*labelText*/ ctx[7]);

    			if (dirty[0] & /*id*/ 32) {
    				attr_dev(label, "for", /*id*/ ctx[5]);
    			}

    			if (dirty[0] & /*labelShow*/ 256 && label_class_value !== (label_class_value = "" + (null_to_empty(/*labelShow*/ ctx[8] ? "" : "sr-only") + " svelte-1hda3m"))) {
    				attr_dev(label, "class", label_class_value);
    			}

    			if (/*tags*/ ctx[0].length > 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1$2(ctx);
    					if_block0.c();
    					if_block0.m(div, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*name*/ 16) {
    				attr_dev(input, "name", /*name*/ ctx[4]);
    			}

    			if (dirty[0] & /*placeholder*/ 2) {
    				attr_dev(input, "placeholder", /*placeholder*/ ctx[1]);
    			}

    			if (dirty[0] & /*id*/ 32) {
    				attr_dev(input, "id", /*id*/ ctx[5]);
    			}

    			if (dirty[0] & /*disable*/ 64) {
    				prop_dev(input, "disabled", /*disable*/ ctx[6]);
    			}

    			if (dirty[0] & /*tag*/ 1024 && input.value !== /*tag*/ ctx[10]) {
    				set_input_value(input, /*tag*/ ctx[10]);
    			}

    			if (dirty[0] & /*disable*/ 64) {
    				toggle_class(div, "sti-layout-disable", /*disable*/ ctx[6]);
    			}

    			if (/*autoComplete*/ ctx[2] && /*arrelementsmatch*/ ctx[9].length > 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$3(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (detaching) detach_dev(t3);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getClipboardData(e) {
    	if (window.clipboardData) {
    		return window.clipboardData.getData('Text');
    	}

    	if (e.clipboardData) {
    		return e.clipboardData.getData('text/plain');
    	}

    	return '';
    }

    function uniqueID() {
    	return 'sti_' + Math.random().toString(36).substr(2, 9);
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let matchsID;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tags', slots, []);
    	const dispatch = createEventDispatcher();
    	let tag = "";
    	let arrelementsmatch = [];

    	let regExpEscape = s => {
    		return s.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&");
    	};

    	let { tags } = $$props;
    	let { addKeys } = $$props;
    	let { maxTags } = $$props;
    	let { onlyUnique } = $$props;
    	let { removeKeys } = $$props;
    	let { placeholder } = $$props;
    	let { allowPaste } = $$props;
    	let { allowDrop } = $$props;
    	let { splitWith } = $$props;
    	let { autoComplete } = $$props;
    	let { autoCompleteKey } = $$props;
    	let { name } = $$props;
    	let { id } = $$props;
    	let { allowBlur } = $$props;
    	let { disable } = $$props;
    	let { minChars } = $$props;
    	let { onlyAutocomplete } = $$props;
    	let { labelText } = $$props;
    	let { labelShow } = $$props;
    	let storePlaceholder = placeholder;

    	function setTag(input) {
    		const currentTag = input.target.value;

    		if (addKeys) {
    			addKeys.forEach(function (key) {
    				if (key === input.keyCode) {
    					if (currentTag) input.preventDefault();

    					/* switch (input.keyCode) {
    case 9:
        // TAB add first element on the autoComplete list
        if (autoComplete && document.getElementById(matchsID)) {                        
            addTag(document.getElementById(matchsID).querySelectorAll("li")[0].textContent);
        } else {
            addTag(currentTag);
        }                    
        break;
    default:
        addTag(currentTag);
        break;
    } */
    					if (autoComplete && document.getElementById(matchsID)) {
    						addTag(document.getElementById(matchsID).querySelectorAll("li")[0].textContent);
    					} else {
    						addTag(currentTag);
    					}
    				}
    			});
    		}

    		if (removeKeys) {
    			removeKeys.forEach(function (key) {
    				if (key === input.keyCode && tag === "") {
    					tags.pop();
    					$$invalidate(0, tags);
    					dispatch('tags', { tags });
    					$$invalidate(9, arrelementsmatch = []);
    					document.getElementById(id).readOnly = false;
    					$$invalidate(1, placeholder = storePlaceholder);
    					document.getElementById(id).focus();
    				}
    			});
    		}

    		// ArrowDown : focus on first element of the autocomplete
    		if (input.keyCode === 40 && autoComplete && document.getElementById(matchsID)) {
    			event.preventDefault();
    			document.getElementById(matchsID).querySelector("li:first-child").focus();
    		} else if (input.keyCode === 38 && autoComplete && document.getElementById(matchsID)) {
    			event.preventDefault(); // ArrowUp : focus on last element of the autocomplete
    			document.getElementById(matchsID).querySelector("li:last-child").focus();
    		}
    	}

    	function addTag(currentTag) {
    		if (typeof currentTag === 'object' && currentTag !== null) {
    			if (!autoCompleteKey) {
    				return console.error("'autoCompleteKey' is necessary if 'autoComplete' result is an array of objects");
    			}

    			var currentObjTags = currentTag;
    			currentTag = currentTag[autoCompleteKey].trim();
    		} else {
    			currentTag = currentTag.trim();
    		}

    		if (currentTag == "") return;
    		if (maxTags && tags.length == maxTags) return;
    		if (onlyUnique && tags.includes(currentTag)) return;
    		if (onlyAutocomplete && arrelementsmatch.length === 0) return;
    		tags.push(currentObjTags ? currentObjTags : currentTag);
    		$$invalidate(0, tags);
    		$$invalidate(10, tag = "");
    		dispatch('tags', { tags });

    		// Hide autocomplete list
    		// Focus on svelte tags input
    		$$invalidate(9, arrelementsmatch = []);

    		document.getElementById(id).focus();

    		if (maxTags && tags.length == maxTags) {
    			document.getElementById(id).readOnly = true;
    			$$invalidate(1, placeholder = "");
    		}

    		
    	}

    	function removeTag(i) {
    		tags.splice(i, 1);
    		$$invalidate(0, tags);
    		dispatch('tags', { tags });

    		// Hide autocomplete list
    		// Focus on svelte tags input
    		$$invalidate(9, arrelementsmatch = []);

    		document.getElementById(id).readOnly = false;
    		$$invalidate(1, placeholder = storePlaceholder);
    		document.getElementById(id).focus();
    	}

    	function onPaste(e) {
    		if (!allowPaste) return;
    		e.preventDefault();
    		const data = getClipboardData(e);
    		splitTags(data).map(tag => addTag(tag));
    	}

    	function onDrop(e) {
    		if (!allowDrop) return;
    		e.preventDefault();
    		const data = e.dataTransfer.getData("Text");
    		splitTags(data).map(tag => addTag(tag));
    	}

    	function onBlur(tag) {
    		if (!document.getElementById(matchsID) && allowBlur) {
    			event.preventDefault();
    			addTag(tag);
    		}
    	}

    	function splitTags(data) {
    		return data.split(splitWith).map(tag => tag.trim());
    	}

    	async function getMatchElements(input) {
    		if (!autoComplete) return;
    		let autoCompleteValues = [];

    		if (Array.isArray(autoComplete)) {
    			autoCompleteValues = autoComplete;
    		}

    		if (typeof autoComplete === 'function') {
    			if (autoComplete.constructor.name === 'AsyncFunction') {
    				autoCompleteValues = await autoComplete();
    			} else {
    				autoCompleteValues = autoComplete();
    			}
    		}

    		var value = input.target.value;

    		// Escape
    		if (value == "" || input.keyCode === 27 || value.length < minChars) {
    			$$invalidate(9, arrelementsmatch = []);
    			return;
    		}

    		if (typeof autoCompleteValues[0] === 'object' && autoCompleteValues !== null) {
    			if (!autoCompleteKey) {
    				return console.error("'autoCompleteValue' is necessary if 'autoComplete' result is an array of objects");
    			}

    			var matchs = autoCompleteValues.filter(e => e[autoCompleteKey].toLowerCase().includes(value.toLowerCase())).map(matchTag => {
    				return {
    					label: matchTag,
    					search: matchTag[autoCompleteKey].replace(RegExp(regExpEscape(value.toLowerCase()), 'i'), "<strong>$&</strong>")
    				};
    			});
    		} else {
    			var matchs = autoCompleteValues.filter(e => e.toLowerCase().includes(value.toLowerCase())).map(matchTag => {
    				return {
    					label: matchTag,
    					search: matchTag.replace(RegExp(regExpEscape(value.toLowerCase()), 'i'), "<strong>$&</strong>")
    				};
    			});
    		}

    		if (onlyUnique === true && !autoCompleteKey) {
    			matchs = matchs.filter(tag => !tags.includes(tag.label));
    		}

    		$$invalidate(9, arrelementsmatch = matchs);
    	}

    	function navigateAutoComplete(autoCompleteIndex, autoCompleteLength, autoCompleteElement) {
    		if (!autoComplete) return;
    		event.preventDefault();

    		// ArrowDown
    		if (event.keyCode === 40) {
    			// Last element on the list ? Go to the first
    			if (autoCompleteIndex + 1 === autoCompleteLength) {
    				document.getElementById(matchsID).querySelector("li:first-child").focus();
    				return;
    			}

    			document.getElementById(matchsID).querySelectorAll("li")[autoCompleteIndex + 1].focus();
    		} else if (event.keyCode === 38) {
    			// ArrowUp
    			// First element on the list ? Go to the last
    			if (autoCompleteIndex === 0) {
    				document.getElementById(matchsID).querySelector("li:last-child").focus();
    				return;
    			}

    			document.getElementById(matchsID).querySelectorAll("li")[autoCompleteIndex - 1].focus();
    		} else if (event.keyCode === 13) {
    			// Enter
    			addTag(autoCompleteElement);
    		} else if (event.keyCode === 27) {
    			// Escape
    			$$invalidate(9, arrelementsmatch = []);

    			document.getElementById(id).focus();
    		}
    	}

    	

    	const writable_props = [
    		'tags',
    		'addKeys',
    		'maxTags',
    		'onlyUnique',
    		'removeKeys',
    		'placeholder',
    		'allowPaste',
    		'allowDrop',
    		'splitWith',
    		'autoComplete',
    		'autoCompleteKey',
    		'name',
    		'id',
    		'allowBlur',
    		'disable',
    		'minChars',
    		'onlyAutocomplete',
    		'labelText',
    		'labelShow'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$3.warn(`<Tags> was created with unknown prop '${key}'`);
    	});

    	const click_handler = i => removeTag(i);

    	function input_input_handler() {
    		tag = this.value;
    		$$invalidate(10, tag);
    	}

    	const blur_handler = () => onBlur(tag);
    	const keydown_handler = (index, element) => navigateAutoComplete(index, arrelementsmatch.length, element.label);
    	const click_handler_1 = element => addTag(element.label);

    	$$self.$$set = $$props => {
    		if ('tags' in $$props) $$invalidate(0, tags = $$props.tags);
    		if ('addKeys' in $$props) $$invalidate(19, addKeys = $$props.addKeys);
    		if ('maxTags' in $$props) $$invalidate(20, maxTags = $$props.maxTags);
    		if ('onlyUnique' in $$props) $$invalidate(21, onlyUnique = $$props.onlyUnique);
    		if ('removeKeys' in $$props) $$invalidate(22, removeKeys = $$props.removeKeys);
    		if ('placeholder' in $$props) $$invalidate(1, placeholder = $$props.placeholder);
    		if ('allowPaste' in $$props) $$invalidate(23, allowPaste = $$props.allowPaste);
    		if ('allowDrop' in $$props) $$invalidate(24, allowDrop = $$props.allowDrop);
    		if ('splitWith' in $$props) $$invalidate(25, splitWith = $$props.splitWith);
    		if ('autoComplete' in $$props) $$invalidate(2, autoComplete = $$props.autoComplete);
    		if ('autoCompleteKey' in $$props) $$invalidate(3, autoCompleteKey = $$props.autoCompleteKey);
    		if ('name' in $$props) $$invalidate(4, name = $$props.name);
    		if ('id' in $$props) $$invalidate(5, id = $$props.id);
    		if ('allowBlur' in $$props) $$invalidate(26, allowBlur = $$props.allowBlur);
    		if ('disable' in $$props) $$invalidate(6, disable = $$props.disable);
    		if ('minChars' in $$props) $$invalidate(27, minChars = $$props.minChars);
    		if ('onlyAutocomplete' in $$props) $$invalidate(28, onlyAutocomplete = $$props.onlyAutocomplete);
    		if ('labelText' in $$props) $$invalidate(7, labelText = $$props.labelText);
    		if ('labelShow' in $$props) $$invalidate(8, labelShow = $$props.labelShow);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		tag,
    		arrelementsmatch,
    		regExpEscape,
    		tags,
    		addKeys,
    		maxTags,
    		onlyUnique,
    		removeKeys,
    		placeholder,
    		allowPaste,
    		allowDrop,
    		splitWith,
    		autoComplete,
    		autoCompleteKey,
    		name,
    		id,
    		allowBlur,
    		disable,
    		minChars,
    		onlyAutocomplete,
    		labelText,
    		labelShow,
    		storePlaceholder,
    		setTag,
    		addTag,
    		removeTag,
    		onPaste,
    		onDrop,
    		onBlur,
    		getClipboardData,
    		splitTags,
    		getMatchElements,
    		navigateAutoComplete,
    		uniqueID,
    		matchsID
    	});

    	$$self.$inject_state = $$props => {
    		if ('tag' in $$props) $$invalidate(10, tag = $$props.tag);
    		if ('arrelementsmatch' in $$props) $$invalidate(9, arrelementsmatch = $$props.arrelementsmatch);
    		if ('regExpEscape' in $$props) regExpEscape = $$props.regExpEscape;
    		if ('tags' in $$props) $$invalidate(0, tags = $$props.tags);
    		if ('addKeys' in $$props) $$invalidate(19, addKeys = $$props.addKeys);
    		if ('maxTags' in $$props) $$invalidate(20, maxTags = $$props.maxTags);
    		if ('onlyUnique' in $$props) $$invalidate(21, onlyUnique = $$props.onlyUnique);
    		if ('removeKeys' in $$props) $$invalidate(22, removeKeys = $$props.removeKeys);
    		if ('placeholder' in $$props) $$invalidate(1, placeholder = $$props.placeholder);
    		if ('allowPaste' in $$props) $$invalidate(23, allowPaste = $$props.allowPaste);
    		if ('allowDrop' in $$props) $$invalidate(24, allowDrop = $$props.allowDrop);
    		if ('splitWith' in $$props) $$invalidate(25, splitWith = $$props.splitWith);
    		if ('autoComplete' in $$props) $$invalidate(2, autoComplete = $$props.autoComplete);
    		if ('autoCompleteKey' in $$props) $$invalidate(3, autoCompleteKey = $$props.autoCompleteKey);
    		if ('name' in $$props) $$invalidate(4, name = $$props.name);
    		if ('id' in $$props) $$invalidate(5, id = $$props.id);
    		if ('allowBlur' in $$props) $$invalidate(26, allowBlur = $$props.allowBlur);
    		if ('disable' in $$props) $$invalidate(6, disable = $$props.disable);
    		if ('minChars' in $$props) $$invalidate(27, minChars = $$props.minChars);
    		if ('onlyAutocomplete' in $$props) $$invalidate(28, onlyAutocomplete = $$props.onlyAutocomplete);
    		if ('labelText' in $$props) $$invalidate(7, labelText = $$props.labelText);
    		if ('labelShow' in $$props) $$invalidate(8, labelShow = $$props.labelShow);
    		if ('storePlaceholder' in $$props) storePlaceholder = $$props.storePlaceholder;
    		if ('matchsID' in $$props) matchsID = $$props.matchsID;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*tags*/ 1) {
    			$$invalidate(0, tags = tags || []);
    		}

    		if ($$self.$$.dirty[0] & /*addKeys*/ 524288) {
    			$$invalidate(19, addKeys = addKeys || [13]);
    		}

    		if ($$self.$$.dirty[0] & /*maxTags*/ 1048576) {
    			$$invalidate(20, maxTags = maxTags || false);
    		}

    		if ($$self.$$.dirty[0] & /*onlyUnique*/ 2097152) {
    			$$invalidate(21, onlyUnique = onlyUnique || false);
    		}

    		if ($$self.$$.dirty[0] & /*removeKeys*/ 4194304) {
    			$$invalidate(22, removeKeys = removeKeys || [8]);
    		}

    		if ($$self.$$.dirty[0] & /*placeholder*/ 2) {
    			$$invalidate(1, placeholder = placeholder || "");
    		}

    		if ($$self.$$.dirty[0] & /*allowPaste*/ 8388608) {
    			$$invalidate(23, allowPaste = allowPaste || false);
    		}

    		if ($$self.$$.dirty[0] & /*allowDrop*/ 16777216) {
    			$$invalidate(24, allowDrop = allowDrop || false);
    		}

    		if ($$self.$$.dirty[0] & /*splitWith*/ 33554432) {
    			$$invalidate(25, splitWith = splitWith || ",");
    		}

    		if ($$self.$$.dirty[0] & /*autoComplete*/ 4) {
    			$$invalidate(2, autoComplete = autoComplete || false);
    		}

    		if ($$self.$$.dirty[0] & /*autoCompleteKey*/ 8) {
    			$$invalidate(3, autoCompleteKey = autoCompleteKey || false);
    		}

    		if ($$self.$$.dirty[0] & /*name*/ 16) {
    			$$invalidate(4, name = name || "svelte-tags-input");
    		}

    		if ($$self.$$.dirty[0] & /*id*/ 32) {
    			$$invalidate(5, id = id || uniqueID());
    		}

    		if ($$self.$$.dirty[0] & /*allowBlur*/ 67108864) {
    			$$invalidate(26, allowBlur = allowBlur || false);
    		}

    		if ($$self.$$.dirty[0] & /*disable*/ 64) {
    			$$invalidate(6, disable = disable || false);
    		}

    		if ($$self.$$.dirty[0] & /*minChars*/ 134217728) {
    			$$invalidate(27, minChars = minChars || 1);
    		}

    		if ($$self.$$.dirty[0] & /*onlyAutocomplete*/ 268435456) {
    			$$invalidate(28, onlyAutocomplete = onlyAutocomplete || false);
    		}

    		if ($$self.$$.dirty[0] & /*labelText, name*/ 144) {
    			$$invalidate(7, labelText = labelText || name);
    		}

    		if ($$self.$$.dirty[0] & /*labelShow*/ 256) {
    			$$invalidate(8, labelShow = labelShow || false);
    		}

    		if ($$self.$$.dirty[0] & /*id*/ 32) {
    			matchsID = id + "_matchs";
    		}
    	};

    	return [
    		tags,
    		placeholder,
    		autoComplete,
    		autoCompleteKey,
    		name,
    		id,
    		disable,
    		labelText,
    		labelShow,
    		arrelementsmatch,
    		tag,
    		setTag,
    		addTag,
    		removeTag,
    		onPaste,
    		onDrop,
    		onBlur,
    		getMatchElements,
    		navigateAutoComplete,
    		addKeys,
    		maxTags,
    		onlyUnique,
    		removeKeys,
    		allowPaste,
    		allowDrop,
    		splitWith,
    		allowBlur,
    		minChars,
    		onlyAutocomplete,
    		click_handler,
    		input_input_handler,
    		blur_handler,
    		keydown_handler,
    		click_handler_1
    	];
    }

    class Tags extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$3,
    			create_fragment$3,
    			safe_not_equal,
    			{
    				tags: 0,
    				addKeys: 19,
    				maxTags: 20,
    				onlyUnique: 21,
    				removeKeys: 22,
    				placeholder: 1,
    				allowPaste: 23,
    				allowDrop: 24,
    				splitWith: 25,
    				autoComplete: 2,
    				autoCompleteKey: 3,
    				name: 4,
    				id: 5,
    				allowBlur: 26,
    				disable: 6,
    				minChars: 27,
    				onlyAutocomplete: 28,
    				labelText: 7,
    				labelShow: 8
    			},
    			null,
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tags",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*tags*/ ctx[0] === undefined && !('tags' in props)) {
    			console_1$3.warn("<Tags> was created without expected prop 'tags'");
    		}

    		if (/*addKeys*/ ctx[19] === undefined && !('addKeys' in props)) {
    			console_1$3.warn("<Tags> was created without expected prop 'addKeys'");
    		}

    		if (/*maxTags*/ ctx[20] === undefined && !('maxTags' in props)) {
    			console_1$3.warn("<Tags> was created without expected prop 'maxTags'");
    		}

    		if (/*onlyUnique*/ ctx[21] === undefined && !('onlyUnique' in props)) {
    			console_1$3.warn("<Tags> was created without expected prop 'onlyUnique'");
    		}

    		if (/*removeKeys*/ ctx[22] === undefined && !('removeKeys' in props)) {
    			console_1$3.warn("<Tags> was created without expected prop 'removeKeys'");
    		}

    		if (/*placeholder*/ ctx[1] === undefined && !('placeholder' in props)) {
    			console_1$3.warn("<Tags> was created without expected prop 'placeholder'");
    		}

    		if (/*allowPaste*/ ctx[23] === undefined && !('allowPaste' in props)) {
    			console_1$3.warn("<Tags> was created without expected prop 'allowPaste'");
    		}

    		if (/*allowDrop*/ ctx[24] === undefined && !('allowDrop' in props)) {
    			console_1$3.warn("<Tags> was created without expected prop 'allowDrop'");
    		}

    		if (/*splitWith*/ ctx[25] === undefined && !('splitWith' in props)) {
    			console_1$3.warn("<Tags> was created without expected prop 'splitWith'");
    		}

    		if (/*autoComplete*/ ctx[2] === undefined && !('autoComplete' in props)) {
    			console_1$3.warn("<Tags> was created without expected prop 'autoComplete'");
    		}

    		if (/*autoCompleteKey*/ ctx[3] === undefined && !('autoCompleteKey' in props)) {
    			console_1$3.warn("<Tags> was created without expected prop 'autoCompleteKey'");
    		}

    		if (/*name*/ ctx[4] === undefined && !('name' in props)) {
    			console_1$3.warn("<Tags> was created without expected prop 'name'");
    		}

    		if (/*id*/ ctx[5] === undefined && !('id' in props)) {
    			console_1$3.warn("<Tags> was created without expected prop 'id'");
    		}

    		if (/*allowBlur*/ ctx[26] === undefined && !('allowBlur' in props)) {
    			console_1$3.warn("<Tags> was created without expected prop 'allowBlur'");
    		}

    		if (/*disable*/ ctx[6] === undefined && !('disable' in props)) {
    			console_1$3.warn("<Tags> was created without expected prop 'disable'");
    		}

    		if (/*minChars*/ ctx[27] === undefined && !('minChars' in props)) {
    			console_1$3.warn("<Tags> was created without expected prop 'minChars'");
    		}

    		if (/*onlyAutocomplete*/ ctx[28] === undefined && !('onlyAutocomplete' in props)) {
    			console_1$3.warn("<Tags> was created without expected prop 'onlyAutocomplete'");
    		}

    		if (/*labelText*/ ctx[7] === undefined && !('labelText' in props)) {
    			console_1$3.warn("<Tags> was created without expected prop 'labelText'");
    		}

    		if (/*labelShow*/ ctx[8] === undefined && !('labelShow' in props)) {
    			console_1$3.warn("<Tags> was created without expected prop 'labelShow'");
    		}
    	}

    	get tags() {
    		throw new Error("<Tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tags(value) {
    		throw new Error("<Tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get addKeys() {
    		throw new Error("<Tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set addKeys(value) {
    		throw new Error("<Tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get maxTags() {
    		throw new Error("<Tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set maxTags(value) {
    		throw new Error("<Tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onlyUnique() {
    		throw new Error("<Tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onlyUnique(value) {
    		throw new Error("<Tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get removeKeys() {
    		throw new Error("<Tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set removeKeys(value) {
    		throw new Error("<Tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholder() {
    		throw new Error("<Tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholder(value) {
    		throw new Error("<Tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get allowPaste() {
    		throw new Error("<Tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set allowPaste(value) {
    		throw new Error("<Tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get allowDrop() {
    		throw new Error("<Tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set allowDrop(value) {
    		throw new Error("<Tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get splitWith() {
    		throw new Error("<Tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set splitWith(value) {
    		throw new Error("<Tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get autoComplete() {
    		throw new Error("<Tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set autoComplete(value) {
    		throw new Error("<Tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get autoCompleteKey() {
    		throw new Error("<Tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set autoCompleteKey(value) {
    		throw new Error("<Tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<Tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get allowBlur() {
    		throw new Error("<Tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set allowBlur(value) {
    		throw new Error("<Tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disable() {
    		throw new Error("<Tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disable(value) {
    		throw new Error("<Tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get minChars() {
    		throw new Error("<Tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set minChars(value) {
    		throw new Error("<Tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onlyAutocomplete() {
    		throw new Error("<Tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onlyAutocomplete(value) {
    		throw new Error("<Tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get labelText() {
    		throw new Error("<Tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set labelText(value) {
    		throw new Error("<Tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get labelShow() {
    		throw new Error("<Tags>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set labelShow(value) {
    		throw new Error("<Tags>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Index.svelte generated by Svelte v3.44.0 */

    const { console: console_1$2 } = globals;
    const file$1 = "src/Index.svelte";

    // (249:16) {#if status_visible}
    function create_if_block_3$1(ctx) {
    	let div;
    	let span;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			span.textContent = "Sending";
    			attr_dev(span, "class", "sr-only");
    			add_location(span, file$1, 253, 24, 7176);
    			attr_dev(div, "class", "spinner-border text-success");
    			attr_dev(div, "role", "status");
    			add_location(div, file$1, 249, 20, 7027);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(249:16) {#if status_visible}",
    		ctx
    	});

    	return block;
    }

    // (265:16) {#if succ_visible}
    function create_if_block_2$1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Save Successfully";
    			attr_dev(div, "class", "alert alert-success");
    			attr_dev(div, "role", "alert");
    			attr_dev(div, "id", "status-msg");
    			add_location(div, file$1, 265, 20, 7487);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(265:16) {#if succ_visible}",
    		ctx
    	});

    	return block;
    }

    // (274:16) {#if err_visible}
    function create_if_block_1$1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Save Failed";
    			attr_dev(div, "class", "alert alert-danger");
    			attr_dev(div, "role", "alert");
    			attr_dev(div, "id", "status-msg");
    			add_location(div, file$1, 274, 20, 7788);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(274:16) {#if err_visible}",
    		ctx
    	});

    	return block;
    }

    // (289:8) {#if show_image}
    function create_if_block$2(ctx) {
    	let div;
    	let button;
    	let span;
    	let t1;
    	let img;
    	let img_src_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			span = element("span");
    			span.textContent = "×";
    			t1 = space();
    			img = element("img");
    			add_location(span, file$1, 291, 20, 8294);
    			attr_dev(button, "class", "close");
    			add_location(button, file$1, 290, 16, 8230);
    			if (!src_url_equal(img.src, img_src_value = /*image*/ ctx[3])) attr_dev(img, "src", img_src_value);
    			set_style(img, "display", "block");
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-1kw4yi");
    			add_location(img, file$1, 293, 16, 8357);
    			attr_dev(div, "class", "col-md-4");
    			add_location(div, file$1, 289, 12, 8191);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(button, span);
    			append_dev(div, t1);
    			append_dev(div, img);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*removePic*/ ctx[14], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*image*/ 8 && !src_url_equal(img.src, img_src_value = /*image*/ ctx[3])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(289:8) {#if show_image}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div22;
    	let form;
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let label0;
    	let br;
    	let t1;
    	let textarea;
    	let t2;
    	let div5;
    	let div3;
    	let t3;
    	let div4;
    	let tags0;
    	let t4;
    	let div8;
    	let div6;
    	let t5;
    	let div7;
    	let tags1;
    	let t6;
    	let div11;
    	let div9;
    	let t7;
    	let div10;
    	let input;
    	let t8;
    	let label1;
    	let t10;
    	let button0;
    	let t12;
    	let button1;
    	let t14;
    	let div15;
    	let div12;
    	let t15;
    	let div14;
    	let div13;
    	let t16;
    	let div19;
    	let div16;
    	let t17;
    	let div18;
    	let div17;
    	let t18;
    	let t19;
    	let div21;
    	let div20;
    	let t20;
    	let current;
    	let mounted;
    	let dispose;

    	tags0 = new Tags({
    			props: {
    				tags: /*tag*/ ctx[1],
    				placeholder: "Tags"
    			},
    			$$inline: true
    		});

    	tags0.$on("tags", /*handleTags*/ ctx[10]);

    	tags1 = new Tags({
    			props: {
    				tags: /*page*/ ctx[2],
    				placeholder: "Link"
    			},
    			$$inline: true
    		});

    	tags1.$on("tags", /*handlePage*/ ctx[11]);
    	let if_block0 = /*status_visible*/ ctx[5] && create_if_block_3$1(ctx);
    	let if_block1 = /*succ_visible*/ ctx[6] && create_if_block_2$1(ctx);
    	let if_block2 = /*err_visible*/ ctx[7] && create_if_block_1$1(ctx);
    	let if_block3 = /*show_image*/ ctx[4] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div22 = element("div");
    			form = element("form");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			label0 = element("label");
    			br = element("br");
    			t1 = space();
    			textarea = element("textarea");
    			t2 = space();
    			div5 = element("div");
    			div3 = element("div");
    			t3 = space();
    			div4 = element("div");
    			create_component(tags0.$$.fragment);
    			t4 = space();
    			div8 = element("div");
    			div6 = element("div");
    			t5 = space();
    			div7 = element("div");
    			create_component(tags1.$$.fragment);
    			t6 = space();
    			div11 = element("div");
    			div9 = element("div");
    			t7 = space();
    			div10 = element("div");
    			input = element("input");
    			t8 = space();
    			label1 = element("label");
    			label1.textContent = "Photo";
    			t10 = space();
    			button0 = element("button");
    			button0.textContent = "Reset";
    			t12 = space();
    			button1 = element("button");
    			button1.textContent = "Save";
    			t14 = space();
    			div15 = element("div");
    			div12 = element("div");
    			t15 = space();
    			div14 = element("div");
    			div13 = element("div");
    			if (if_block0) if_block0.c();
    			t16 = space();
    			div19 = element("div");
    			div16 = element("div");
    			t17 = space();
    			div18 = element("div");
    			div17 = element("div");
    			if (if_block1) if_block1.c();
    			t18 = space();
    			if (if_block2) if_block2.c();
    			t19 = space();
    			div21 = element("div");
    			div20 = element("div");
    			t20 = space();
    			if (if_block3) if_block3.c();
    			attr_dev(div0, "class", "col-md-2");
    			add_location(div0, file$1, 181, 12, 4919);
    			attr_dev(label0, "for", "");
    			add_location(label0, file$1, 183, 16, 4995);
    			add_location(br, file$1, 183, 32, 5011);
    			attr_dev(textarea, "rows", "8");
    			attr_dev(textarea, "class", "form-control");
    			add_location(textarea, file$1, 184, 16, 5034);
    			attr_dev(div1, "class", "col-md-8");
    			add_location(div1, file$1, 182, 12, 4956);
    			attr_dev(div2, "class", "form-group row");
    			add_location(div2, file$1, 180, 8, 4878);
    			attr_dev(div3, "class", "col-md-2");
    			add_location(div3, file$1, 196, 12, 5387);
    			attr_dev(div4, "class", "col-md-8");
    			add_location(div4, file$1, 197, 12, 5424);
    			attr_dev(div5, "class", "form-group row");
    			add_location(div5, file$1, 195, 8, 5346);
    			attr_dev(div6, "class", "col-md-2");
    			add_location(div6, file$1, 207, 12, 5683);
    			attr_dev(div7, "class", "col-md-8");
    			add_location(div7, file$1, 208, 12, 5720);
    			attr_dev(div8, "class", "form-group row");
    			add_location(div8, file$1, 206, 8, 5642);
    			attr_dev(div9, "class", "col-md-2");
    			add_location(div9, file$1, 218, 12, 5994);
    			attr_dev(input, "type", "file");
    			attr_dev(input, "id", "fileElem");
    			attr_dev(input, "class", "visually-hidden svelte-1kw4yi");
    			attr_dev(input, "accept", "image/*");
    			add_location(input, file$1, 220, 16, 6070);
    			attr_dev(label1, "for", "fileElem");
    			attr_dev(label1, "class", "svelte-1kw4yi");
    			add_location(label1, file$1, 227, 16, 6304);
    			attr_dev(button0, "class", "btn btn-danger btn-sm");
    			add_location(button0, file$1, 228, 16, 6356);
    			attr_dev(button1, "class", "btn btn-success float-right");
    			attr_dev(button1, "id", "submit-btn");
    			attr_dev(button1, "type", "submit");
    			set_style(button1, "margin-left", "4px");
    			button1.disabled = true;
    			add_location(button1, file$1, 232, 16, 6502);
    			attr_dev(div10, "class", "col-md-8");
    			add_location(div10, file$1, 219, 12, 6031);
    			attr_dev(div11, "class", "row");
    			set_style(div11, "margin-top", "20px");
    			add_location(div11, file$1, 217, 8, 5939);
    			attr_dev(form, "name", "entry");
    			attr_dev(form, "role", "form");
    			add_location(form, file$1, 179, 4, 4838);
    			attr_dev(div12, "class", "col-md-2");
    			add_location(div12, file$1, 245, 8, 6861);
    			attr_dev(div13, "class", "text-center");
    			add_location(div13, file$1, 247, 12, 6944);
    			attr_dev(div14, "class", "col-md-8");
    			attr_dev(div14, "id", "status-sp");
    			add_location(div14, file$1, 246, 8, 6894);
    			attr_dev(div15, "class", "row");
    			add_location(div15, file$1, 244, 4, 6835);
    			attr_dev(div16, "class", "col-md-2");
    			add_location(div16, file$1, 261, 8, 7338);
    			attr_dev(div17, "class", "text-center");
    			add_location(div17, file$1, 263, 12, 7406);
    			attr_dev(div18, "class", "col-md-8");
    			add_location(div18, file$1, 262, 8, 7371);
    			attr_dev(div19, "class", "row");
    			add_location(div19, file$1, 260, 4, 7312);
    			attr_dev(div20, "class", "col-md-4");
    			add_location(div20, file$1, 287, 8, 8129);
    			attr_dev(div21, "class", "row");
    			set_style(div21, "margin-top", "20px");
    			add_location(div21, file$1, 286, 4, 8078);
    			attr_dev(div22, "class", "tab-content svelte-1kw4yi");
    			add_location(div22, file$1, 178, 0, 4808);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div22, anchor);
    			append_dev(div22, form);
    			append_dev(form, div2);
    			append_dev(div2, div0);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, label0);
    			append_dev(div1, br);
    			append_dev(div1, t1);
    			append_dev(div1, textarea);
    			set_input_value(textarea, /*content*/ ctx[0]);
    			append_dev(form, t2);
    			append_dev(form, div5);
    			append_dev(div5, div3);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			mount_component(tags0, div4, null);
    			append_dev(form, t4);
    			append_dev(form, div8);
    			append_dev(div8, div6);
    			append_dev(div8, t5);
    			append_dev(div8, div7);
    			mount_component(tags1, div7, null);
    			append_dev(form, t6);
    			append_dev(form, div11);
    			append_dev(div11, div9);
    			append_dev(div11, t7);
    			append_dev(div11, div10);
    			append_dev(div10, input);
    			append_dev(div10, t8);
    			append_dev(div10, label1);
    			append_dev(div10, t10);
    			append_dev(div10, button0);
    			append_dev(div10, t12);
    			append_dev(div10, button1);
    			append_dev(div22, t14);
    			append_dev(div22, div15);
    			append_dev(div15, div12);
    			append_dev(div15, t15);
    			append_dev(div15, div14);
    			append_dev(div14, div13);
    			if (if_block0) if_block0.m(div13, null);
    			append_dev(div22, t16);
    			append_dev(div22, div19);
    			append_dev(div19, div16);
    			append_dev(div19, t17);
    			append_dev(div19, div18);
    			append_dev(div18, div17);
    			if (if_block1) if_block1.m(div17, null);
    			append_dev(div17, t18);
    			if (if_block2) if_block2.m(div17, null);
    			append_dev(div22, t19);
    			append_dev(div22, div21);
    			append_dev(div21, div20);
    			append_dev(div21, t20);
    			if (if_block3) if_block3.m(div21, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[17]),
    					listen_dev(textarea, "input", /*handleInput*/ ctx[8], false, false, false),
    					listen_dev(textarea, "keyup", /*handleKeyup*/ ctx[9], false, false, false),
    					listen_dev(textarea, "paste", /*handlePaste*/ ctx[16], false, false, false),
    					listen_dev(input, "change", /*fileSelected*/ ctx[13], false, false, false),
    					listen_dev(button0, "click", /*clearAll*/ ctx[15], false, false, false),
    					listen_dev(button1, "click", /*handleSave*/ ctx[12], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*content*/ 1) {
    				set_input_value(textarea, /*content*/ ctx[0]);
    			}

    			const tags0_changes = {};
    			if (dirty & /*tag*/ 2) tags0_changes.tags = /*tag*/ ctx[1];
    			tags0.$set(tags0_changes);
    			const tags1_changes = {};
    			if (dirty & /*page*/ 4) tags1_changes.tags = /*page*/ ctx[2];
    			tags1.$set(tags1_changes);

    			if (/*status_visible*/ ctx[5]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_3$1(ctx);
    					if_block0.c();
    					if_block0.m(div13, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*succ_visible*/ ctx[6]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_2$1(ctx);
    					if_block1.c();
    					if_block1.m(div17, t18);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*err_visible*/ ctx[7]) {
    				if (if_block2) ; else {
    					if_block2 = create_if_block_1$1(ctx);
    					if_block2.c();
    					if_block2.m(div17, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*show_image*/ ctx[4]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block$2(ctx);
    					if_block3.c();
    					if_block3.m(div21, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tags0.$$.fragment, local);
    			transition_in(tags1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tags0.$$.fragment, local);
    			transition_out(tags1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div22);
    			destroy_component(tags0);
    			destroy_component(tags1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Index', slots, []);
    	const jq = window.$;
    	let content = "";
    	let tag = [];
    	let page = [];
    	let image = "";
    	let show_image = false;
    	let status_visible = false;
    	let succ_visible = false;
    	let err_visible = false;

    	onMount(async () => {
    		addImageHook();
    		restoreTags();
    	});

    	function restoreTags() {
    		$$invalidate(0, content = window.localStorage.getItem("content"));
    		let stored_tags = window.localStorage.getItem("tag");

    		if (stored_tags != null) {
    			$$invalidate(1, tag = stored_tags.trim().split(",").filter(w => w.length > 0));
    		}

    		let stored_page = window.localStorage.getItem("page");

    		if (stored_page != null) {
    			$$invalidate(2, page = stored_page.trim().split(",").filter(w => w.length > 0));
    		}
    	}

    	function addImageHook() {
    		jq("body").on("click", "img", function (e) {
    			let rato = jq(this).width() / jq(this).parent().width();

    			if (rato <= 0.6) {
    				jq(this).css("width", "100%");
    				jq(this).css("height", "100%");
    			} else {
    				jq(this).css("width", "50%");
    			}
    		});
    	}

    	function handleInput(event) {
    		jq("#submit-btn").prop("disabled", false);
    		window.localStorage.setItem("content", content);
    	}

    	function handleKeyup(event) {
    		if (event.key == "[" || event.key == "]") {
    			$$invalidate(0, content = content.replaceAll("【", "[").replaceAll("】", "]"));
    		}
    	}

    	function showSuccMsg() {
    		$$invalidate(5, status_visible = false);
    		$$invalidate(6, succ_visible = true);
    	}

    	function showErrMsg() {
    		$$invalidate(5, status_visible = false);
    		$$invalidate(7, err_visible = true);
    	}

    	function handleTags(event) {
    		$$invalidate(1, tag = event.detail.tags);
    		window.localStorage.setItem("tag", tag);
    	}

    	function handlePage(event) {
    		$$invalidate(2, page = event.detail.tags);
    		window.localStorage.setItem("page", page);
    	}

    	function handleSave(event) {
    		event.preventDefault();
    		$$invalidate(5, status_visible = true);

    		let data = JSON.stringify({
    			date: new Date().toISOString(),
    			links: tag.join(","),
    			page: page.length > 0 ? page[0] : "",
    			text: content,
    			image
    		});

    		console.log(data);

    		jq.ajax({
    			url: "/api/entry",
    			crossDomain: true,
    			type: "POST",
    			datatype: "json",
    			contentType: "Application/json",
    			data,
    			success(response) {
    				if (response == "ok") {
    					clearAll(event);
    					showSuccMsg();
    				} else {
    					showErrMsg();
    				}
    			},
    			error(err) {
    				showErrMsg();
    				console.log("There was an error saving the entry: ", err);
    			}
    		});
    	}

    	function fileSelected(event) {
    		console.log(event.target);
    		const file = event.target.files[0];

    		if (!file) {
    			return;
    		}

    		if (!file.type.startsWith("image/")) {
    			alert("Please select a image.");
    			return;
    		}

    		const img = document.createElement("img-tag");
    		img.file = file;
    		const reader = new FileReader();

    		reader.onload = function (e) {
    			$$invalidate(4, show_image = true);
    			$$invalidate(3, image = e.target.result);
    		};

    		reader.readAsDataURL(file);
    	}

    	function clearInput() {
    		$$invalidate(0, content = "");
    		window.localStorage.removeItem("content");
    	}

    	function removePic() {
    		$$invalidate(4, show_image = false);
    		$$invalidate(3, image = "");
    	}

    	function clearAll(event) {
    		event.preventDefault();
    		$$invalidate(5, status_visible = false);
    		window.localStorage.removeItem("links");
    		window.localStorage.removeItem("page");
    		clearInput();
    		removePic();
    	}

    	function handlePaste(event) {
    		console.log(event);
    		let items = (event.clipboardData || event.originalEvent.clipboardData).items;
    		JSON.stringify(items);

    		// will give you the mime types
    		// find pasted image among pasted items
    		let blob = null;

    		for (let i = 0; i < items.length; i++) {
    			if (items[i].type.indexOf("image") === 0) {
    				blob = items[i].getAsFile();
    				break;
    			}
    		}

    		// load image if there is a pasted image
    		if (blob !== null) {
    			let reader = new FileReader();

    			reader.onload = function (e) {
    				$$invalidate(3, image = e.target.result);
    				$$invalidate(4, show_image = true);
    			};

    			reader.readAsDataURL(blob);
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$2.warn(`<Index> was created with unknown prop '${key}'`);
    	});

    	function textarea_input_handler() {
    		content = this.value;
    		$$invalidate(0, content);
    	}

    	$$self.$capture_state = () => ({
    		Tags,
    		onMount,
    		jq,
    		content,
    		tag,
    		page,
    		image,
    		show_image,
    		status_visible,
    		succ_visible,
    		err_visible,
    		restoreTags,
    		addImageHook,
    		handleInput,
    		handleKeyup,
    		showSuccMsg,
    		showErrMsg,
    		handleTags,
    		handlePage,
    		handleSave,
    		fileSelected,
    		clearInput,
    		removePic,
    		clearAll,
    		handlePaste
    	});

    	$$self.$inject_state = $$props => {
    		if ('content' in $$props) $$invalidate(0, content = $$props.content);
    		if ('tag' in $$props) $$invalidate(1, tag = $$props.tag);
    		if ('page' in $$props) $$invalidate(2, page = $$props.page);
    		if ('image' in $$props) $$invalidate(3, image = $$props.image);
    		if ('show_image' in $$props) $$invalidate(4, show_image = $$props.show_image);
    		if ('status_visible' in $$props) $$invalidate(5, status_visible = $$props.status_visible);
    		if ('succ_visible' in $$props) $$invalidate(6, succ_visible = $$props.succ_visible);
    		if ('err_visible' in $$props) $$invalidate(7, err_visible = $$props.err_visible);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		content,
    		tag,
    		page,
    		image,
    		show_image,
    		status_visible,
    		succ_visible,
    		err_visible,
    		handleInput,
    		handleKeyup,
    		handleTags,
    		handlePage,
    		handleSave,
    		fileSelected,
    		removePic,
    		clearAll,
    		handlePaste,
    		textarea_input_handler
    	];
    }

    class Index extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Index",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Page.svelte generated by Svelte v3.44.0 */

    const { console: console_1$1 } = globals;
    const file_1 = "src/Page.svelte";

    // (418:34) 
    function create_if_block_4(ctx) {
    	let div12;
    	let div3;
    	let div2;
    	let div1;
    	let input;
    	let t0;
    	let div0;
    	let button;
    	let i;
    	let t1;
    	let t2;
    	let t3;
    	let div8;
    	let div4;
    	let t4;
    	let div6;
    	let div5;
    	let h4;
    	let span;
    	let t5;
    	let div7;
    	let t6;
    	let div11;
    	let div10;
    	let div9;
    	let mounted;
    	let dispose;
    	let if_block0 = /*show_status*/ ctx[1] && create_if_block_6(ctx);
    	let if_block1 = /*show_search_nav*/ ctx[2] && create_if_block_5(ctx);

    	const block = {
    		c: function create() {
    			div12 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			input = element("input");
    			t0 = space();
    			div0 = element("div");
    			button = element("button");
    			i = element("i");
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			t3 = space();
    			div8 = element("div");
    			div4 = element("div");
    			t4 = space();
    			div6 = element("div");
    			div5 = element("div");
    			h4 = element("h4");
    			span = element("span");
    			t5 = space();
    			div7 = element("div");
    			t6 = space();
    			div11 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "form-control");
    			attr_dev(input, "placeholder", "search ...");
    			attr_dev(input, "id", "searchInput");
    			add_location(input, file_1, 422, 24, 13577);
    			attr_dev(i, "class", "fa fa-search");
    			add_location(i, file_1, 437, 32, 14265);
    			attr_dev(button, "class", "btn btn-secondary");
    			attr_dev(button, "type", "button");
    			attr_dev(button, "id", "searchBtn");
    			set_style(button, "margin-left", "5px");
    			add_location(button, file_1, 430, 28, 13937);
    			attr_dev(div0, "class", "input-group-append");
    			add_location(div0, file_1, 429, 24, 13876);
    			attr_dev(div1, "class", "input-group");
    			set_style(div1, "margin-top", "30px");
    			add_location(div1, file_1, 421, 20, 13502);
    			attr_dev(div2, "class", "col-md-10");
    			add_location(div2, file_1, 420, 16, 13458);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file_1, 419, 12, 13424);
    			attr_dev(div4, "class", "col-md-2");
    			add_location(div4, file_1, 487, 16, 16099);
    			attr_dev(span, "class", "badge badge-secondary");
    			attr_dev(span, "id", "fileName");
    			add_location(span, file_1, 491, 28, 16292);
    			add_location(h4, file_1, 490, 24, 16259);
    			attr_dev(div5, "class", "text-center");
    			set_style(div5, "margin-top", "20px");
    			add_location(div5, file_1, 489, 20, 16183);
    			attr_dev(div6, "class", "col-md-6");
    			add_location(div6, file_1, 488, 16, 16140);
    			attr_dev(div7, "class", "col-md-2");
    			add_location(div7, file_1, 495, 16, 16441);
    			attr_dev(div8, "class", "row");
    			add_location(div8, file_1, 486, 12, 16065);
    			attr_dev(div9, "class", "pageContent");
    			div9.hidden = "true";
    			attr_dev(div9, "id", "page-content");
    			add_location(div9, file_1, 500, 20, 16576);
    			attr_dev(div10, "class", "col-md-10");
    			add_location(div10, file_1, 499, 16, 16532);
    			attr_dev(div11, "class", "row");
    			add_location(div11, file_1, 498, 12, 16498);
    			attr_dev(div12, "id", "search");
    			add_location(div12, file_1, 418, 8, 13394);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div12, anchor);
    			append_dev(div12, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, input);
    			set_input_value(input, /*search_input*/ ctx[3]);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, button);
    			append_dev(button, i);
    			append_dev(div12, t1);
    			if (if_block0) if_block0.m(div12, null);
    			append_dev(div12, t2);
    			if (if_block1) if_block1.m(div12, null);
    			append_dev(div12, t3);
    			append_dev(div12, div8);
    			append_dev(div8, div4);
    			append_dev(div8, t4);
    			append_dev(div8, div6);
    			append_dev(div6, div5);
    			append_dev(div5, h4);
    			append_dev(h4, span);
    			append_dev(div8, t5);
    			append_dev(div8, div7);
    			append_dev(div12, t6);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div9);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[10]),
    					listen_dev(button, "click", /*search*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*search_input*/ 8 && input.value !== /*search_input*/ ctx[3]) {
    				set_input_value(input, /*search_input*/ ctx[3]);
    			}

    			if (/*show_status*/ ctx[1]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_6(ctx);
    					if_block0.c();
    					if_block0.m(div12, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*show_search_nav*/ ctx[2]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_5(ctx);
    					if_block1.c();
    					if_block1.m(div12, t3);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div12);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(418:34) ",
    		ctx
    	});

    	return block;
    }

    // (378:55) 
    function create_if_block_2(ctx) {
    	let div1;
    	let div0;
    	let button;
    	let t1;
    	let t2;
    	let div6;
    	let div2;
    	let t3;
    	let div4;
    	let div3;
    	let h4;
    	let span;
    	let t4;
    	let div5;
    	let t5;
    	let div9;
    	let div8;
    	let div7;
    	let mounted;
    	let dispose;
    	let if_block = /*show_status*/ ctx[1] && create_if_block_3(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			button = element("button");
    			button.textContent = "Edit";
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			div6 = element("div");
    			div2 = element("div");
    			t3 = space();
    			div4 = element("div");
    			div3 = element("div");
    			h4 = element("h4");
    			span = element("span");
    			t4 = space();
    			div5 = element("div");
    			t5 = space();
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-warning");
    			set_style(button, "float", "center");
    			attr_dev(button, "id", "editBtn");
    			add_location(button, file_1, 380, 16, 12083);
    			attr_dev(div0, "class", "col-md-10 text-right");
    			add_location(div0, file_1, 379, 12, 12032);
    			attr_dev(div1, "class", "row card sticky-top");
    			set_style(div1, "margin-top", "20px");
    			set_style(div1, "border", "0");
    			add_location(div1, file_1, 378, 8, 11949);
    			attr_dev(div2, "class", "col-md-2");
    			add_location(div2, file_1, 402, 12, 12843);
    			attr_dev(span, "class", "badge badge-secondary");
    			attr_dev(span, "id", "fileName");
    			add_location(span, file_1, 406, 24, 13020);
    			add_location(h4, file_1, 405, 20, 12991);
    			attr_dev(div3, "class", "text-center");
    			set_style(div3, "margin-top", "20px");
    			add_location(div3, file_1, 404, 16, 12919);
    			attr_dev(div4, "class", "col-md-6");
    			add_location(div4, file_1, 403, 12, 12880);
    			attr_dev(div5, "class", "col-md-2");
    			add_location(div5, file_1, 410, 12, 13153);
    			attr_dev(div6, "class", "row");
    			add_location(div6, file_1, 401, 8, 12813);
    			attr_dev(div7, "class", "pageContent");
    			attr_dev(div7, "id", "page-content");
    			add_location(div7, file_1, 414, 16, 13271);
    			attr_dev(div8, "class", "col-md-10");
    			add_location(div8, file_1, 413, 12, 13231);
    			attr_dev(div9, "class", "row");
    			add_location(div9, file_1, 412, 8, 13201);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, button);
    			insert_dev(target, t1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div2);
    			append_dev(div6, t3);
    			append_dev(div6, div4);
    			append_dev(div4, div3);
    			append_dev(div3, h4);
    			append_dev(h4, span);
    			append_dev(div6, t4);
    			append_dev(div6, div5);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div7);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*editPage*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*show_status*/ ctx[1]) {
    				if (if_block) ; else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					if_block.m(t2.parentNode, t2);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t1);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div6);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div9);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(378:55) ",
    		ctx
    	});

    	return block;
    }

    // (329:4) {#if cur_page == "day"}
    function create_if_block$1(ctx) {
    	let div1;
    	let div0;
    	let button0;
    	let t1;
    	let button1;
    	let t3;
    	let button2;
    	let t5;
    	let t6;
    	let div6;
    	let div2;
    	let t7;
    	let div4;
    	let div3;
    	let h4;
    	let span;
    	let t8;
    	let div5;
    	let t9;
    	let div9;
    	let div8;
    	let div7;
    	let mounted;
    	let dispose;
    	let if_block = /*show_status*/ ctx[1] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "Prev";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "Edit";
    			t3 = space();
    			button2 = element("button");
    			button2.textContent = "Next";
    			t5 = space();
    			if (if_block) if_block.c();
    			t6 = space();
    			div6 = element("div");
    			div2 = element("div");
    			t7 = space();
    			div4 = element("div");
    			div3 = element("div");
    			h4 = element("h4");
    			span = element("span");
    			t8 = space();
    			div5 = element("div");
    			t9 = space();
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "btn btn-info");
    			set_style(button0, "float", "left");
    			add_location(button0, file_1, 331, 16, 10274);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-warning");
    			set_style(button1, "float", "center");
    			attr_dev(button1, "id", "editBtn");
    			add_location(button1, file_1, 337, 16, 10485);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "btn btn-info");
    			add_location(button2, file_1, 344, 16, 10733);
    			attr_dev(div0, "class", "col-md-10 text-right");
    			add_location(div0, file_1, 330, 12, 10223);
    			attr_dev(div1, "class", "row card sticky-top");
    			set_style(div1, "margin-top", "20px");
    			set_style(div1, "border", "0");
    			add_location(div1, file_1, 329, 8, 10140);
    			attr_dev(div2, "class", "col-md-2");
    			add_location(div2, file_1, 362, 12, 11377);
    			attr_dev(span, "class", "badge badge-secondary");
    			attr_dev(span, "id", "fileName");
    			add_location(span, file_1, 366, 24, 11554);
    			add_location(h4, file_1, 365, 20, 11525);
    			attr_dev(div3, "class", "text-center");
    			set_style(div3, "margin-top", "20px");
    			add_location(div3, file_1, 364, 16, 11453);
    			attr_dev(div4, "class", "col-md-6");
    			add_location(div4, file_1, 363, 12, 11414);
    			attr_dev(div5, "class", "col-md-2");
    			add_location(div5, file_1, 370, 12, 11687);
    			attr_dev(div6, "class", "row");
    			add_location(div6, file_1, 361, 8, 11347);
    			attr_dev(div7, "class", "pageContent");
    			attr_dev(div7, "id", "page-content");
    			add_location(div7, file_1, 374, 16, 11805);
    			attr_dev(div8, "class", "col-md-10");
    			add_location(div8, file_1, 373, 12, 11765);
    			attr_dev(div9, "class", "row");
    			add_location(div9, file_1, 372, 8, 11735);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t1);
    			append_dev(div0, button1);
    			append_dev(div0, t3);
    			append_dev(div0, button2);
    			insert_dev(target, t5, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div2);
    			append_dev(div6, t7);
    			append_dev(div6, div4);
    			append_dev(div4, div3);
    			append_dev(div3, h4);
    			append_dev(h4, span);
    			append_dev(div6, t8);
    			append_dev(div6, div5);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div7);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*prevDaily*/ ctx[5], false, false, false),
    					listen_dev(button1, "click", /*editPage*/ ctx[6], false, false, false),
    					listen_dev(button2, "click", /*nextDaily*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*show_status*/ ctx[1]) {
    				if (if_block) ; else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(t6.parentNode, t6);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t5);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div6);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(div9);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(329:4) {#if cur_page == \\\"day\\\"}",
    		ctx
    	});

    	return block;
    }

    // (444:12) {#if show_status}
    function create_if_block_6(ctx) {
    	let div4;
    	let div0;
    	let t0;
    	let div3;
    	let div2;
    	let div1;
    	let span;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			span = element("span");
    			span.textContent = "sending";
    			attr_dev(div0, "class", "col-md-2");
    			add_location(div0, file_1, 445, 20, 14514);
    			attr_dev(span, "class", "sr-only");
    			add_location(span, file_1, 457, 32, 15013);
    			attr_dev(div1, "class", "spinner-border text-success");
    			attr_dev(div1, "role", "status");
    			add_location(div1, file_1, 453, 28, 14832);
    			attr_dev(div2, "class", "text-center");
    			add_location(div2, file_1, 452, 24, 14778);
    			attr_dev(div3, "class", "col-md-8");
    			div3.hidden = "true";
    			attr_dev(div3, "id", "status-sp");
    			set_style(div3, "margin-top", "20px");
    			add_location(div3, file_1, 446, 20, 14559);
    			attr_dev(div4, "class", "row");
    			add_location(div4, file_1, 444, 16, 14476);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div4, t0);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, span);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(444:12) {#if show_status}",
    		ctx
    	});

    	return block;
    }

    // (465:12) {#if show_search_nav}
    function create_if_block_5(ctx) {
    	let div1;
    	let div0;
    	let button0;
    	let t1;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "Back";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "Edit";
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "btn btn-info");
    			set_style(button0, "float", "left");
    			attr_dev(button0, "id", "backBtn");
    			add_location(button0, file_1, 470, 24, 15458);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-warning");
    			attr_dev(button1, "id", "editBtn");
    			add_location(button1, file_1, 477, 24, 15755);
    			attr_dev(div0, "class", "col-md-10 text-right");
    			attr_dev(div0, "id", "pageNavBar");
    			add_location(div0, file_1, 469, 20, 15383);
    			attr_dev(div1, "class", "row card sticky-top");
    			set_style(div1, "margin-top", "20px");
    			set_style(div1, "border", "0");
    			add_location(div1, file_1, 465, 16, 15235);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t1);
    			append_dev(div0, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*search*/ ctx[7], false, false, false),
    					listen_dev(button1, "click", /*editPage*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(465:12) {#if show_search_nav}",
    		ctx
    	});

    	return block;
    }

    // (390:8) {#if show_status}
    function create_if_block_3(ctx) {
    	let div4;
    	let div0;
    	let t0;
    	let div3;
    	let div2;
    	let div1;
    	let span;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			span = element("span");
    			span.textContent = "Sending";
    			attr_dev(div0, "class", "col-md-2");
    			add_location(div0, file_1, 391, 16, 12421);
    			attr_dev(span, "class", "sr-only");
    			add_location(span, file_1, 395, 28, 12654);
    			attr_dev(div1, "class", "spinner-border text-success");
    			attr_dev(div1, "role", "status");
    			add_location(div1, file_1, 394, 24, 12570);
    			attr_dev(div2, "class", "text-center");
    			add_location(div2, file_1, 393, 20, 12520);
    			attr_dev(div3, "class", "col-md-6");
    			attr_dev(div3, "id", "status-sp");
    			add_location(div3, file_1, 392, 16, 12462);
    			attr_dev(div4, "class", "row");
    			add_location(div4, file_1, 390, 12, 12387);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div4, t0);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, span);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(390:8) {#if show_status}",
    		ctx
    	});

    	return block;
    }

    // (350:8) {#if show_status}
    function create_if_block_1(ctx) {
    	let div4;
    	let div0;
    	let t0;
    	let div3;
    	let div2;
    	let div1;
    	let span;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			span = element("span");
    			span.textContent = "Sending";
    			attr_dev(div0, "class", "col-md-2");
    			add_location(div0, file_1, 351, 16, 10955);
    			attr_dev(span, "class", "sr-only");
    			add_location(span, file_1, 355, 28, 11188);
    			attr_dev(div1, "class", "spinner-border text-success");
    			attr_dev(div1, "role", "status");
    			add_location(div1, file_1, 354, 24, 11104);
    			attr_dev(div2, "class", "text-center");
    			add_location(div2, file_1, 353, 20, 11054);
    			attr_dev(div3, "class", "col-md-6");
    			attr_dev(div3, "id", "status-sp");
    			add_location(div3, file_1, 352, 16, 10996);
    			attr_dev(div4, "class", "row");
    			add_location(div4, file_1, 350, 12, 10921);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div4, t0);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, span);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(350:8) {#if show_status}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;

    	function select_block_type(ctx, dirty) {
    		if (/*cur_page*/ ctx[0] == "day") return create_if_block$1;
    		if (/*cur_page*/ ctx[0] == "rand" || /*cur_page*/ ctx[0] == "todo") return create_if_block_2;
    		if (/*cur_page*/ ctx[0] = "find") return create_if_block_4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "tab-content");
    			add_location(div, file_1, 327, 0, 10078);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);

    			if (if_block) {
    				if_block.d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function padding(value, n) {
    	return String(value).padStart(n, "0");
    }

    function dateStr(date) {
    	return date.getFullYear() + "-" + padding(date.getMonth() + 1, 2) + "-" + padding(date.getDate(), 2);
    }

    function preprocessImage(response) {
    	let result = "";
    	let left = response;

    	while (left.indexOf("![[") != -1) {
    		let prev = left.substring(0, left.indexOf("![["));
    		result += prev;
    		let start = left.indexOf("![[") + 3;
    		let end = left.indexOf("]]", start);
    		let image = left.substring(start, end);
    		let image_url = image.split("|")[0].trim();
    		result += "![img](/static/images/" + encodeURI(image_url) + ")";
    		left = left.substring(end + 2);
    	}

    	result += left;
    	return result;
    }

    function preprocessLink(response) {
    	let result = "";
    	let left = response;

    	while (left.indexOf("[[") != -1) {
    		let prev = left.substring(0, left.indexOf("[["));
    		result += prev;
    		let start = left.indexOf("[[") + 2;
    		let end = left.indexOf("]]", start);
    		let link = left.substring(start, end);
    		left = left.substring(end + 2);
    		if (prev.indexOf("```") != -1 && left.indexOf("```") != -1) result += "[[" + link + "]]"; else result += "[" + link.trim() + "](/##)";
    	}

    	result += left;
    	return result;
    }

    function renderMdToHtml(response) {
    	let result = preprocessImage(response);
    	result = preprocessLink(result);

    	let converter = new showdown.Converter({
    			simpleLineBreaks: true,
    			tasklists: true,
    			headerLevelStart: 2,
    			simplifiedAutoLink: true,
    			strikethrough: true,
    			emoji: true
    		});

    	converter.setFlavor("github");
    	return converter.makeHtml(result);
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Page', slots, []);
    	const jq = window.$;
    	let { cur_page } = $$props;
    	let { cur_time } = $$props;
    	let date = new Date();
    	let file = "";
    	let content = "";
    	let show_status = false;
    	let show_search_nav = false;
    	let search_input = "";
    	let in_edit = false;

    	const refresh = cur => {
    		if (cur_page == "day") {
    			getDaily(date);
    		} else if (cur_page == "rand") {
    			fetchPage("", true);
    		} else if (cur_page == "todo") {
    			fetchPage("Unsort/todo.md", false);
    		} else if (cur_page == "find") {
    			search();
    		}
    	};

    	function nextDaily() {
    		date = new Date(date.setDate(date.getDate() + 1));
    		getDaily(date);
    	}

    	function prevDaily() {
    		date = new Date(date.setDate(date.getDate() - 1));
    		getDaily(date);
    	}

    	function getDaily(date) {
    		let date_str = dateStr(date);
    		fetchPage(`Daily/${date_str}.md`);
    	}

    	function markDone(index) {
    		$$invalidate(1, show_status = true);

    		jq.ajax({
    			url: "/api/mark?index=" + index,
    			type: "POST",
    			success(response) {
    				if (response == "done") {
    					fetchPage("Unsort/todo.md", false);
    				}
    			},
    			error(err) {
    				console.log("Error: ", err);
    			}
    		});
    	}

    	function adjustTodo() {
    		jq("input:checkbox").each(function (index) {
    			jq(this).prop("id", index);
    		});

    		jq("input:checkbox:not(:checked)").each(function () {
    			let parent = jq(this).parent();
    			jq(this).prop("disabled", false);
    			parent.css("color", "red");
    			parent.css("font-weight", "bold");
    		});

    		jq("input:checkbox:not(:checked)").change(function () {
    			if (jq(this).is(":checked")) {
    				markDone(jq(this).prop("id"));
    			}
    		});

    		console.log("adjustTodo finished ...");
    	}

    	function updatePage(file, content) {
    		$$invalidate(1, show_status = true);

    		jq.ajax({
    			url: "/api/page",
    			type: "POST",
    			datatype: "json",
    			contentType: "Application/json",
    			data: JSON.stringify({ file, content }),
    			success(response) {
    				$$invalidate(1, show_status = false);
    				localStorage.setItem("page-content", content);
    				localStorage.setItem("file", file);
    				jq("#page-content").html(renderMdToHtml(content));
    				setPageDefault();
    			},
    			error(err) {
    				$$invalidate(1, show_status = false);
    				console.log(err);
    				return err;
    			}
    		});
    	}

    	function fetchPage(url, rand_query = false) {
    		let date = new Date();
    		let begin_date = new Date(date.setDate(date.getDate() - 1000));
    		$$invalidate(1, show_status = true);

    		jq.ajax({
    			url: `/api/page?path=${url}&rand=${rand_query}`,
    			type: "GET",
    			datatype: "json",
    			contentType: "Application/json",
    			headers: {
    				// Important since warp will cache the unmodified files
    				"If-Modified-Since": begin_date.toISOString()
    			},
    			statusCode: {
    				400() {
    					showLoginModal();
    				}
    			},
    			success(response) {
    				$$invalidate(1, show_status = false);
    				$$invalidate(2, show_search_nav = true);
    				file = response[0];
    				content = response[1];

    				if (file != "NoPage") {
    					localStorage.setItem("page-content", content);
    					localStorage.setItem("file", file);
    					jq(fileName).text(file);
    					jq("#page-content").html(renderMdToHtml(content));
    					setPageDefault();
    				} else {
    					jq("#page-content").html("<h3>No Page</h3>");
    					jq(fileName).text(url);
    				}
    			},
    			error(err) {
    				$$invalidate(1, show_status = false);
    				return err;
    			}
    		});
    	}

    	function hookInit() {
    		jq(".pageContent").off('click').on("click", "a", function (e) {
    			let url = e.target.innerText;

    			if (url.endsWith(".md")) {
    				fetchPage(url, false);
    			} else if (e.target.href == null || e.target.href.indexOf("##") != -1) {
    				e.preventDefault();
    				$$invalidate(3, search_input = url);
    				if (cur_page == "find") search(); else $$invalidate(0, cur_page = "find");
    			}
    		});

    		jq("#searchInput").on("keyup", function (event) {
    			if (event.keyCode == 13) {
    				search();
    			}
    		});
    	}

    	function setPageDefault() {
    		jq("#page-content").prop("contenteditable", false);
    		jq("#page-content").css("backgroundColor", "white");
    		jq("#editBtn").text("Edit");
    		hljs.highlightAll();
    		adjustTodo();
    		hookInit();
    		in_edit = false;

    		if (search_input != "" && cur_page == "find") {
    			highlight(search_input);
    		}
    	}

    	function savePage() {
    		let text = document.getElementById("page-content").innerText.replace(/\u00a0/g, " ");
    		let prev_content = localStorage.getItem("page-content");

    		if (prev_content != text) {
    			updatePage(localStorage.getItem("file"), text);
    		} else {
    			jq("#page-content").html(renderMdToHtml(prev_content));
    			setPageDefault();
    			console.log("same ....");
    		}
    	}

    	function editPage() {
    		if (in_edit) {
    			savePage();
    		} else {
    			let content = document.getElementById("page-content");
    			content.innerText = localStorage.getItem("page-content").replace(/ /g, "\u00a0");
    			jq("#page-content").prop("contenteditable", true);
    			jq("#page-content").css("backgroundColor", "#fffcc0");
    			jq("#editBtn").text("Save");
    			in_edit = true;
    		}
    	}

    	function search() {
    		$$invalidate(1, show_status = true);

    		jq.ajax({
    			url: "/api/search?keyword=" + search_input,
    			type: "GET",
    			datatype: "json",
    			contentType: "Application/json",
    			success(response) {
    				$$invalidate(1, show_status = false);

    				if (response != "no-page") {
    					jq("#page-content").html(renderMdToHtml(response));
    					jq("#page-content").prop("hidden", false);
    					setPageDefault();
    					$$invalidate(2, show_search_nav = false);
    				} else {
    					jq("#page-content").html("<h3>No Page</h3>" + " " + local_date);
    				}
    			},
    			error(err) {
    				$$invalidate(1, show_status = false);
    				return err;
    			}
    		});
    	}

    	function highlight(keyword) {
    		let markInstance = new Mark(jq("#page-content").get(0));
    		let options = {};

    		if (keyword != "" && keyword != undefined) {
    			markInstance.unmark({
    				done() {
    					markInstance.mark(keyword, options);
    				}
    			});
    		}
    	}

    	onMount(async () => {
    		setPageDefault();
    	});

    	const writable_props = ['cur_page', 'cur_time'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Page> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		search_input = this.value;
    		$$invalidate(3, search_input);
    	}

    	$$self.$$set = $$props => {
    		if ('cur_page' in $$props) $$invalidate(0, cur_page = $$props.cur_page);
    		if ('cur_time' in $$props) $$invalidate(8, cur_time = $$props.cur_time);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		jq,
    		cur_page,
    		cur_time,
    		date,
    		file,
    		content,
    		show_status,
    		show_search_nav,
    		search_input,
    		in_edit,
    		refresh,
    		padding,
    		dateStr,
    		nextDaily,
    		prevDaily,
    		getDaily,
    		preprocessImage,
    		markDone,
    		adjustTodo,
    		preprocessLink,
    		renderMdToHtml,
    		updatePage,
    		fetchPage,
    		hookInit,
    		setPageDefault,
    		savePage,
    		editPage,
    		search,
    		highlight
    	});

    	$$self.$inject_state = $$props => {
    		if ('cur_page' in $$props) $$invalidate(0, cur_page = $$props.cur_page);
    		if ('cur_time' in $$props) $$invalidate(8, cur_time = $$props.cur_time);
    		if ('date' in $$props) date = $$props.date;
    		if ('file' in $$props) file = $$props.file;
    		if ('content' in $$props) content = $$props.content;
    		if ('show_status' in $$props) $$invalidate(1, show_status = $$props.show_status);
    		if ('show_search_nav' in $$props) $$invalidate(2, show_search_nav = $$props.show_search_nav);
    		if ('search_input' in $$props) $$invalidate(3, search_input = $$props.search_input);
    		if ('in_edit' in $$props) in_edit = $$props.in_edit;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*cur_time, cur_page*/ 257) {
    			{
    				console.log(cur_time);

    				if (cur_page) {
    					refresh();
    				}
    			}
    		}
    	};

    	return [
    		cur_page,
    		show_status,
    		show_search_nav,
    		search_input,
    		nextDaily,
    		prevDaily,
    		editPage,
    		search,
    		cur_time,
    		refresh,
    		input_input_handler
    	];
    }

    class Page extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { cur_page: 0, cur_time: 8, refresh: 9 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Page",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*cur_page*/ ctx[0] === undefined && !('cur_page' in props)) {
    			console_1$1.warn("<Page> was created without expected prop 'cur_page'");
    		}

    		if (/*cur_time*/ ctx[8] === undefined && !('cur_time' in props)) {
    			console_1$1.warn("<Page> was created without expected prop 'cur_time'");
    		}
    	}

    	get cur_page() {
    		throw new Error("<Page>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set cur_page(value) {
    		throw new Error("<Page>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get cur_time() {
    		throw new Error("<Page>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set cur_time(value) {
    		throw new Error("<Page>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get refresh() {
    		return this.$$.ctx[9];
    	}

    	set refresh(value) {
    		throw new Error("<Page>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.44.0 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    // (26:8) {:else}
    function create_else_block(ctx) {
    	let page_1;
    	let updating_cur_page;
    	let current;

    	function page_1_cur_page_binding(value) {
    		/*page_1_cur_page_binding*/ ctx[5](value);
    	}

    	let page_1_props = { cur_time: /*cur_time*/ ctx[1] };

    	if (/*cur_page*/ ctx[0] !== void 0) {
    		page_1_props.cur_page = /*cur_page*/ ctx[0];
    	}

    	page_1 = new Page({ props: page_1_props, $$inline: true });
    	/*page_1_binding*/ ctx[4](page_1);
    	binding_callbacks.push(() => bind(page_1, 'cur_page', page_1_cur_page_binding));

    	const block = {
    		c: function create() {
    			create_component(page_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(page_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const page_1_changes = {};
    			if (dirty & /*cur_time*/ 2) page_1_changes.cur_time = /*cur_time*/ ctx[1];

    			if (!updating_cur_page && dirty & /*cur_page*/ 1) {
    				updating_cur_page = true;
    				page_1_changes.cur_page = /*cur_page*/ ctx[0];
    				add_flush_callback(() => updating_cur_page = false);
    			}

    			page_1.$set(page_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(page_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(page_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			/*page_1_binding*/ ctx[4](null);
    			destroy_component(page_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(26:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (24:8) {#if cur_page == "index"}
    function create_if_block(ctx) {
    	let index;
    	let current;
    	index = new Index({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(index.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(index, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(index.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(index.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(index, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(24:8) {#if cur_page == \\\"index\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let nav;
    	let t0;
    	let div;
    	let login;
    	let t1;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	nav = new Nav({ $$inline: true });
    	nav.$on("message", /*refresh*/ ctx[3]);
    	login = new Login({ $$inline: true });
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*cur_page*/ ctx[0] == "index") return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(nav.$$.fragment);
    			t0 = space();
    			div = element("div");
    			create_component(login.$$.fragment);
    			t1 = space();
    			if_block.c();
    			attr_dev(div, "class", "container");
    			add_location(div, file, 20, 4, 432);
    			add_location(main, file, 17, 0, 388);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(nav, main, null);
    			append_dev(main, t0);
    			append_dev(main, div);
    			mount_component(login, div, null);
    			append_dev(div, t1);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			transition_in(login.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			transition_out(login.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(nav);
    			destroy_component(login);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let cur_page = "index";
    	let cur_time = Date.now();
    	let page;

    	const refresh = event => {
    		$$invalidate(0, cur_page = event.detail);
    		console.log(cur_page);
    		$$invalidate(1, cur_time = Date.now());
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function page_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			page = $$value;
    			$$invalidate(2, page);
    		});
    	}

    	function page_1_cur_page_binding(value) {
    		cur_page = value;
    		$$invalidate(0, cur_page);
    	}

    	$$self.$capture_state = () => ({
    		Login,
    		Nav,
    		Index,
    		Page,
    		cur_page,
    		cur_time,
    		page,
    		refresh
    	});

    	$$self.$inject_state = $$props => {
    		if ('cur_page' in $$props) $$invalidate(0, cur_page = $$props.cur_page);
    		if ('cur_time' in $$props) $$invalidate(1, cur_time = $$props.cur_time);
    		if ('page' in $$props) $$invalidate(2, page = $$props.page);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [cur_page, cur_time, page, refresh, page_1_binding, page_1_cur_page_binding];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
