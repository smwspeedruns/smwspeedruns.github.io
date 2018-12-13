var player_mapping = {};

jQuery(document).ready(function($){
	var md = window.markdownit();
	$('button[data-board]').on('click', function(){
		var btn = $(this);
		var data = btn.data();
		var filter = data.filter ? '&' + data.filter : '';
		var datatable = $('#runs_table').DataTable();

		$('button[data-board]', btn.parent()).removeClass('btn-success').addClass('btn-secondary');
		btn.toggleClass('btn-secondary btn-success');

		if(btn.parent().attr('id') == 'maincat') $('[id^="subcat"]').hide();
		if(data.sub){
			$(`[id="subcat_${data.sub}"] button:first`).trigger('click');
			$(`[id="subcat_${data.sub}"]`).show();
			return false;
		}

	    datatable.clear();
		datatable.draw();
		$.get(`https://www.speedrun.com/api/v1/leaderboards/${data.board}/category/${data.category}?embed=players,category,regions,platforms${filter}`, function(response) {
			data = response.data;
			var runs = data.runs;
			for(var player of data.players.data) {
				if(player.rel === "guest") {
					continue;
				}
				player_mapping[player.id] = player;
			}

			var category = data.category.data;
			$('#rules h3').text(category.name);
			$('#rules p').html(md.render(category.rules));

		    datatable.rows.add(runs);
			datatable.draw();

		}, 'json');
	})

	$('#runs_table').DataTable({
		paging: false,
		columns: [
			{ data: 'place', className: "text-center" },
			{ data: 'run.players', render: function(data, type, row, meta){
				var players = [];
				for(var p of data){
					var player = player_mapping[p.id];
					var location = player && player.location ? `<img src="//www.speedrun.com/images/flags/${player.location.country.code}.png" height="12" title="${player.location.country.names.intenational}" />` : '';
					players.push(
						p.rel === "guest" ? p.name : `${location} <a href="${player.weblink}" target="_blank">${player.names.international}</a>`
					);
				}
				return players.join(' & '); 
			} },
			{ data: 'run.times.primary_t', className: "text-center time", render: function(data, type, row, meta){ return secs2time(data * 1000); } },
			{ data: 'run.date', className: "text-center", render: function(data, type, row, meta){ return data ? (new Date(data)).toLocaleDateString('pt-br') : 'Unavailable'; } }
		],
		order: [[ 0, "asc" ]]
	});

	function secs2time(miliseconds){
		var units = {'h': 3600000, 'm': 60000, 's': 1000, 'ms': 1}, ms = 0, time = [], high_num = false;
		if(miliseconds <= 0) return "0:00:00";

		for(unit in units){
			div = units[unit];
			num = Math.floor(miliseconds / div);
			//num = unit != 'ms' ? num / 1000
			if(high_num){
				num = '000' + num;
				num = num.substr(num.length - (unit == 'ms' ? 3 : 2));
			}
			if(unit == 'ms') ms = num;
			else if(num > 0 || high_num){
				high_num = true;
				time.push(num);
			}
			miliseconds = miliseconds % div;
		}
		return time.join(':') + (ms > 0 ? `<sub>.${ms}</sub>` : '');
	}



	$('button[data-board]:first').trigger('click');
});