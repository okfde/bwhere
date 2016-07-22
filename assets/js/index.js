// 99% based on the work by https://github.com/pbock

window.addEventListener('DOMContentLoaded', function () {
	var baseLayer = L.tileLayer(
		'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
			maxZoom: 18
		}
	);
	var cfg = {
		// radius should be small ONLY if scaleRadius is true (or small radius is intended)
		"radius": 0.012,
		"maxOpacity": 0.6,
		// scales the radius based on map zoom
		"scaleRadius": true,
		// if set to false the heatmap uses the global maximum for colorization
		// if activated: uses the data maximum within the current map boundaries
		//   (there will always be a red spot with useLocalExtremas true)
		"useLocalExtrema": false,
		// which field name in your data represents the latitude - default "lat"
		latField: 'lat',
		// which field name in your data represents the longitude - default "lng"
		lngField: 'lng',
		// which field name in your data represents the data value - default "value"
		valueField: 'value'
	};
	var heatmapLayer = new HeatmapOverlay(cfg);
	var map = new L.Map(document.querySelector('.map'), {
		center: new L.LatLng(52.5, 13.4),
		zoom: 10,
		layers: [baseLayer, heatmapLayer]
	});
	var data;
	var markers = [];
	var groups = [];
	var active_groups = [];
	var campaigns = ['1', '2'];
	var active_campaigns = ['1', '2'];
	var colors = ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a'];
	var colorsByCategory = {};
	var markerLayer;

	var display = function () {
		var list = data.filter(function (d) {
			return (active_groups.indexOf(d.group) >= 0) &&
				(active_campaigns.indexOf(d.campaign.toString()) >= 0);
		}).map(function (d) {
			return d.geocode;
		});
		heatmapLayer.setData({data: list, length: list.length});
		markerLayer.clearLayers();
		markers.forEach(function (marker) {
			var d = data[parseInt(marker.id)];
			if ((active_groups.indexOf(d.group) >= 0) &&
				(active_campaigns.indexOf(d.campaign.toString()) >= 0)) {
				markerLayer.addLayer(marker);
			}
		});
	};

	function getColorForCategory(category) {
		if (!colorsByCategory[category]) colorsByCategory[category] = colors.shift();
		return colorsByCategory[category];
	}

	var initGroups = function () {

		var command = L.control({position: 'topright'});

		command.onAdd = function (map) {
			var div = L.DomUtil.create('div', 'command');
			var checkboxes = [];
			var update = function () {
				active_groups = checkboxes.filter(function (checkbox) {
					return checkbox.checked;
				}).map(function (checkbox) {
					return checkbox.id;
				});
				display();
			};

			groups.forEach(function (group) {
				var form = div.appendChild(L.DomUtil.create('form'));
				var checkbox = form.appendChild(L.DomUtil.create('input'));
				checkbox.type = 'checkbox';
				checkbox.id = group;
				checkbox.checked = true;
				checkbox.addEventListener('change', update);
				checkboxes.push(checkbox);
				var label = form.appendChild(L.DomUtil.create('label'));
				label.innerHTML = group;
				label.setAttribute('for', group);
			});

			return div;
		};

		command.addTo(map);

	};
	var initCampaign = function () {

		var command = L.control({position: 'topright'});

		command.onAdd = function (map) {
			var div = L.DomUtil.create('div', 'command');
			var checkboxes = [];
			var update = function () {
				active_campaigns = checkboxes.filter(function (checkbox) {
					return checkbox.checked;
				}).map(function (checkbox) {
					return checkbox.id;
				});
				display();
			};

			campaigns.forEach(function (campaign) {
				var form = div.appendChild(L.DomUtil.create('form'));
				var checkbox = form.appendChild(L.DomUtil.create('input'));
				checkbox.type = 'checkbox';
				checkbox.id = campaign;
				checkbox.checked = active_campaigns.indexOf(campaign) >= 0;
				checkbox.addEventListener('change', update);
				checkboxes.push(checkbox);
				var label = form.appendChild(L.DomUtil.create('label'));
				label.innerHTML = 'Campaign ' + campaign;
				label.setAttribute('for', campaign);
			});

			return div;
		};

		command.addTo(map);

	};

	var initMarkers = function () {
		markers = data
			.map(function (d, id) {
				var marker = L.circleMarker(
					[d.geocode.lat, d.geocode.lng],
					{
						radius: 5,
						fillColor: getColorForCategory(d.group),
						stroke: false,
						fillOpacity: 1
					}
				).bindPopup(
					'<div><b>' + d.adr + '</b><br>' + d.postcode + ' ' + d.city + '<br>' + d.group + '<br>' + 'Campaign: ' + d.campaign + '</div>'
				);
				marker.id = id;
				return marker;
			});
		markerLayer = L.layerGroup(markers);
	};

	var init = function (adspaces) {
		data = adspaces;
		data.forEach(function (d) {
			d.geocode.value = 0.1;
			if (groups.indexOf(d.group) < 0) groups.push(d.group);
		});
		active_groups = groups;
		initCampaign();
		initGroups();
		initMarkers();
		display();


		L.control.layers({}, {
			'Heatmap': heatmapLayer,
			'Marker': markerLayer
		}, {collapsed: false}).addTo(map);
		// Ugly hack that ensures that popups will be properly aligned with regards
		// to the circleMarkers
		map.removeLayer(heatmapLayer);
		map.addLayer(heatmapLayer);
	};

	fetch('assets/data/adspaces.json')
		.then(function (res) {
			return res.json();
		})
		.then(function (data) {
			var adspaces = data.rows.map(function (row) {
				return {
					adr: row[0],
					postcode: data.postcodes[row[1]],
					city: data.cities[row[2]],
					group: data.groups[row[3]],
					campaign: row[4],
					geocode: {
						lat: row[5],
						lng: row[6]
					}
				}
			});
			init(adspaces);
		});
});
