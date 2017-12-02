//duplicate wraps exceed the height of the actual wraps, so as you scroll down the elements behind are still technically there but ust hidden

//if text node, wrap text in a span and that will be better for getBoundingClientRect
//if SVG...
//if img...
(function() {
	'use strict';

	var scr;

	function ScrollusPocus(mainElementConfig, targetPanesConfig) {
		scr = this;
		//constructor
		scr.mainElementSelector = mainElementConfig;
		scr.mainElementDetails = scr.getMainElementDetails();
		//mainElement Type (Text, image)
		scr.mainElementType;
		//main element after range
		scr.mainElementInnerRangePos;
		//main element overall
		scr.mainElementPos;

		scr.targetPanes = scr.getTargetPaneDetails(targetPanesConfig);
		scr.scrollywrap;
		scr.dupElementWraps = [];

		scr.init();
	}

	ScrollusPocus.prototype.getMainElementDetails = function() {
		return document.querySelectorAll(scr.mainElementSelector)[0];
	};

	ScrollusPocus.prototype.getTargetPaneDetails = function(targetPanesConfig) {
		return targetPanesConfig.map(function(e) {
			return {
				domEl: document.querySelectorAll(e.element),
				targetColor: e.color
			};
		});
	};

	ScrollusPocus.prototype.duplicateElement = function() {
		//make scrollywrap
		scr.scrollyWrap = document.createElement('div');
		scr.scrollyWrap.classList.add('scrollyWrap');
		//add scrollywrap to body
		document.body.appendChild(scr.scrollyWrap);
		scr.targetPanes.forEach(function(e, i) {
			//make data-attributes on both original and duplicate containrs
			e.domEl[0].setAttribute('data-scrolly', 'container' + i);

			//create a duplicate wrapper for each target pane and add to the scrolly wrap
			var dupElementWrap = document.createElement('div');
			dupElementWrap.classList.add('dupElementWrap');
			dupElementWrap.setAttribute('data-scrolly-duplicate', 'container' + i);
			scr.scrollyWrap.appendChild(dupElementWrap);

			//create inner wrapper for duplicate element
			var dupElementInner = document.createElement('div');
			dupElementInner.classList.add('dupElementInner');
			dupElementWrap.appendChild(dupElementInner);

			//add duplicate wrapper to duplicate wrapper array on the class
			scr.dupElementWraps.push(dupElementWrap);

			//duplicate and style main element
			var dupMainElement = scr.mainElementDetails.cloneNode(true);
			dupElementInner.appendChild(dupMainElement);
			_applyStyleEachPane(e, dupMainElement);
		});
	};

	ScrollusPocus.prototype.init = function() {
		//get element type (text, image?)
		//also need to style image based on type - i.e. if text it can be styled there, but if image, another image or a few may be needed
		//also SVG...
		_getMainElementType();

		//get main element position (text, svg, image inners) both inner and actual
		if (scr.mainElementType == 'text') {
			scr.mainElementInnerRangePos = _getMainInnerElementRange();
		}
		scr.mainElementPos = _getMainElement();

		scr.duplicateElement();
		_applyStyleDuplicatePanes();
		_applyPosition();

		_scrollListener();
		_resizeListener();

		//general styles
		scr.mainElementDetails.style.visibility = 'hidden';
		Object.assign(scr.scrollyWrap.style, {
			position: 'fixed',
			top: '0px',
			left: '0px',
			right: '0px',
			overflow: 'hidden'
		});

		_setElToWindowHeight(scr.scrollyWrap);
	};

	function _applyStyleEachPane(pane, dupMainElement) {
		//styles applied inside each of the target wrap elements
		//needed to apply specified colour to element
		Object.assign(dupMainElement.style, {
			color: pane.targetColor,
			position: 'absolute',
			margin: 'auto',
			padding: 'auto'
		});
	}

	function _applyStyleDuplicatePanes() {
		scr.dupElementWraps.forEach(function(e) {
			Object.assign(e.style, {
				overflow: 'hidden',
				position: 'absolute',
				top: '0px',
				left: '0px',
				right: '0px',
				bottom: '0px'
			});
			var inner = e.getElementsByClassName('dupElementInner')[0];
			Object.assign(inner.style, {
				overflow: 'hidden',
				position: 'absolute',
				top: '0px',
				left: '0px',
				right: '0px',
				bottom: '0px'
			});
		});
	}

	function _applyPosition() {
		var translateYMainElement;
		var translateXMainElement;

		if (scr.mainElementType == 'text') {
			translateYMainElement = scr.mainElementPos.y;
			translateXMainElement = scr.mainElementInnerRangePos.x;
		} else if (scr.mainElementType == 'img') {
			translateYMainElement = scr.mainElementPos.y;
			translateXMainElement = scr.mainElementPos.x;
		}
		scr.targetPanes.forEach(function(e) {
			var translateYTargetPane = e.domEl[0].getBoundingClientRect().y;
			scr.dupElementWraps.forEach(function(eInner) {
				if (
					eInner.getAttribute('data-scrolly-duplicate') ==
					e.domEl[0].getAttribute('data-scrolly')
				) {
					eInner.style.transform = `translateY(${translateYTargetPane}px)`;
					translateYTargetPane < 0
						? (eInner.querySelector(
							'.dupElementInner'
						).style.transform = `translateY(${Math.abs(translateYTargetPane) *
								1}px)`)
						: (eInner.querySelector(
							'.dupElementInner'
						).style.transform = `translateY(-${translateYTargetPane}px)`);

					eInner.querySelector(
						scr.mainElementSelector
					).style.transform = `translateY(${translateYMainElement}px) translateX(${translateXMainElement}px)`;
				}
			});
		});
	}

	function _getMainElementType() {
		if (
			scr.mainElementDetails.getElementsByTagName('img').length > 0 ||
			scr.mainElementDetails.nodeName == 'IMG'
		) {
			scr.mainElementType = 'img';
		} else if (typeof scr.mainElementDetails.innerHTML == 'string') {
			scr.mainElementType = 'text';
		} else {
			scr.mainElementType = 'other';
		}
	}

	function _getMainInnerElementRange() {
		var innerElement = scr.mainElementDetails.childNodes[0];
		var range = document.createRange();
		range.selectNode(innerElement);
		return range.getBoundingClientRect();
	}

	function _getMainElement() {
		return scr.mainElementDetails.getBoundingClientRect();
	}

	function _setElToWindowHeight(el) {
		if (el.length > 1) {
			el.forEach(function(e) {
				e.style.height = window.innerHeight + 'px';
			});
		} else {
			el.style.height = window.innerHeight + 'px';
		}
	}

	function _scrollListener() {
		var last_known_scroll_position = 0;
		var ticking = false;

		window.addEventListener('scroll', function(e) {
			last_known_scroll_position = window.scrollY;
			if (!ticking) {
				window.requestAnimationFrame(function() {
					_applyPosition();
					ticking = false;
				});
				ticking = true;
			}
		});
	}
	function _resizeListener() {
		window.addEventListener('resize', function(e) {
			//_setElToWindowHeight();
		});
	}

	window.ScrollusPocus = ScrollusPocus;
})();
