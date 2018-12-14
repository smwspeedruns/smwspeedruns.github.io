var player_mapping = {}, platform_mapping = {}, region_mapping = {}, first_time = 0, datatable = null;

jQuery(document).ready(function($){
	var md = window.markdownit();
	$('button[data-board]').on('click', function(){
		var btn = $(this);
		var data = btn.data();
		var filter = data.filter ? '&' + data.filter : '';

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
			$('#runs_table').data('info', data);

			var runs = data.runs;
			first_time = data.runs[0].run.times.primary_t;
			for(var player of data.players.data){
				if(player.rel === "guest") continue;
				player_mapping[player.id] = player;
			}
			for(var region of data.regions.data){
				region_mapping[region.id] = region;
			}
			for(var platform of data.platforms.data){
				platform_mapping[platform.id] = platform;
			}

			var category = data.category.data;
			$('#rules h3').text(category.name);
			$('#rules p').html(md.render(category.rules));

		    datatable.rows.add(runs);
			datatable.draw();

		}, 'json');
	})

	datatable = $('#runs_table').DataTable({
		paging: false,
		columns: [
			{ data: 'place', orderable: false, className: "text-center" },
			{ data: 'run.players', orderable: false, render: render_players },
			{ data: 'run.times.primary_t', className: "text-center time", render: render_time },
			{ data: 'run.times.primary_t', className: "text-center time", orderable: false, visible: false, render: render_difftime },
			{ data: 'run.date', className: "text-center", render: render_date },
			{ data: 'run.videos.links', className: "text-center video", orderable: false, render: render_video }
		],
		order: [[ 2, "asc" ]]
	});


	$('#timediff').on('change', function(){
		var col = datatable.column(3);
		col.visible(! $(this).prop('checked'));
	});

	$('#runs_table tbody').on('click', 'tr', function(){
        var data = datatable.row(this).data(); console.log(data);
        var cat = $('#runs_table').data('info');
        var run_info = $('#run_info');

        $('.category', run_info).text(cat.category.data.name);

        $('.run .nick', run_info).html(render_players(data.run.players));
        $('.run .time', run_info).html(render_time(data.run.times.primary_t, 'display', data));
        $('.comment', run_info).html(md.render(data.run.comment ? data.run.comment : ''));
        
        var video_url = false;
        if(data.run.videos) for(var link of data.run.videos.links){
	        var video = link.uri.match(/(youtu\.be|youtube\.com|twitch\.tv|nicovideo\.jp).*\/(?:watch\?v=)?([^\/]+)$/);
	        if(video) switch(video[1]){
	    		case 'youtu.be':
	    		case 'youtube.com':
	    			video_url = `//www.youtube.com/embed/${video[2]}`;
	    		break;
	    		case 'twitch.tv':
	    			video_url = `//player.twitch.tv/?video=v${video[2]}&autoplay=false&time=0`;
	    		break;
	    		case 'nicovideo.jp':
	    			video_url = `//embed.nicovideo.jp/watch/${video[2]}?oldScript=1&referer=&from=0&allowProgrammaticFullScreen=1`;
	    		break;
	    	}
	    }
        $('.video iframe', run_info).attr('src', video_url)
        $('.video', run_info).toggle(video_url != false);

        var platform = platform_mapping[data.run.system.platform];
        var region = region_mapping[data.run.system.region];
        $('.played .system', run_info).text(platform.name);
        $('.played .region', run_info).html(region ? render_flag(region.name.substr(0,2), region.name) : '').toggle(region != undefined);
        $('.played date', run_info).html(render_date(data.run.date));
        $('.played .emu', run_info).toggle(data.run.system.emulated);

        $('.verifier .nick', run_info).html(render_player(player_mapping[data.run.status.examiner]));
        $('.verifier date', run_info).html(render_date(data.run.status["verify-date"]));
        run_info.modal();

    });

	function render_video(video, type='display', row=null, meta=null){
		return video ? `<a href="${video[0].uri}" target="_blank"><i class="fas fa-video"></i></a>` : '<i class="fas fa-video-slash"></i>';
	} 
    function render_date(date, type='display', row=null, meta=null){
    	return type == 'display' ? (date ? (new Date(date)).toLocaleDateString('pt-br') : 'Unavailable') : date;
    }
	function render_time(time, type='display', row=null, meta=null){
		return type == 'display' ? `<time class="place-${row.place}">${secs2time(time * 1000)}</time>` : time * 1000;
	}
	function render_difftime(time, type='display', row=null, meta=null){
		var diff = (time * 1000) - (first_time * 1000);
		return diff > 0 ? `<span style="color:green">+${secs2time(diff)}</span>` : '-';
	}
	function render_flag(code, title){
		return `<img src="//www.speedrun.com/images/flags/${code.toLowerCase()}.png" height="12" title="${title}" />`;
	}
	function render_player(player){
		var location = player.location ? render_flag(player.location.country.code, player.location.country.names.international) : '';
		var color = player['name-style']['color-from'] ? `style="background-image: -webkit-linear-gradient(left, ${player['name-style']['color-from'].dark}, ${player['name-style']['color-to'].dark})"` : '';
		return `${location} <a href="${player.weblink}" class="nickname" ${color} target="_blank">${player.names.international}</a>`;
	}
	function render_players(data, type='display', row=null, meta=null){
		var players = [];
		for(var p of data){
			var player = player_mapping[p.id];
			players.push(
				p.rel === "guest" ? p.name : render_player(player)
			);
		}
		return players.join(' & '); 
	}

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
			else if(num > 0 || high_num || unit == 's'){
				high_num = true;
				time.push(num);
			}
			miliseconds = miliseconds % div;
		}
		return time.join(':') + (ms > 0 ? `<sub>.${ms}</sub>` : '');
	}



	$('button[data-board]:first').trigger('click');
});