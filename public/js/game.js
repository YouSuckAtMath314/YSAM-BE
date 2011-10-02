// Create the canvas
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");
canvas.width = 1024;
canvas.height = 768;
document.body.appendChild(canvas);

var theme_song = new Audio("audio/matchtrack.mp3");
var buttons = [];
var guid = Math.floor(Math.random()*10000); // HACK for now
var channel = null;

var playerstate = [
    {"health":0.4},
    {"health":0.8},
]

var statechange_time = Date.now();

var gamestate = 'loading';
var gameplay_state = 'selecting';
var player_image = null;
var enemy_image = null;
var orb_hopper = [];
var orb_columns= [];
var orb_colors = [ "R", "G", "B", "Y"];
var orb_colors_map = {
     "R": "effects_orb_red",
     "G": "effects_orb_blue",
     "B": "effects_orb_green",
     "Y": "effects_orb_yellow",
};

picked_orbs = [];

var question = {"text": "", "answer":"" };

var onLoadClosure = function( image )
{
    return function() {
         image.loaded = true;
         };
};

var loadart = function ( artindex )
{
    for( key in artindex )
    {  
        var image =  new Image();

        image.loaded = false;
        image.onload = onLoadClosure( image ); 
        image.src = artindex[key].path;

        artindex[key]["image"] = image;   
    }
};

var load_audio = function ( audioindex )
{
    for( key in audioindex )
    {  
        var sound =  new Audio( audioindex[key].path );

        audioindex[key]["audio"] = sound;   
    }
};

var artloaded = function( artindex )
{
    var isloaded = true; 
    for( key in artindex )
    {  
        if( !artindex[key].image.loaded )
        {
            isloaded = false;
        } 
    }
    return isloaded;
};

var render_health_bar = function(x, y, health, empty_bar, full_bar)
{
    var split = Math.floor(full_bar.image.width * health);
    ctx.drawImage( full_bar.image, 0, 0, split, full_bar.image.height, x,y, split, full_bar.image.height );
    ctx.drawImage( empty_bar.image, split, 0, empty_bar.image.width - split, empty_bar.image.height, x+split, y, empty_bar.image.width - split, empty_bar.image.height );
};

var render_avatar = function(avatar_image, x, y, health)
{
    var frame = Math.round( (1 - health) * 4);
    var topy = avatar_image.frame_height * frame;
    var height = Math.min( avatar_image.image.height - topy, avatar_image.frame_height);
    ctx.drawImage( avatar_image.image, 0, topy , avatar_image.image.width, height, x,y, avatar_image.image.width, height );
};

var render_health = function()
{
    render_health_bar(0,0, playerstate[0].health, artindex.bg_health_empty, artindex.bg_health_full_red);

    render_health_bar(canvas.width - artindex.bg_health_empty.image.width ,0, playerstate[1].health, artindex.bg_health_empty, artindex.bg_health_full_blue);

    render_avatar(player_image, ((300 - player_image.image.width) / 2), 80, playerstate[0].health );
    render_avatar(enemy_image, (canvas.width - 150) - (enemy_image.image.width / 2), 80, playerstate[1].health );
};

var render_gameplay = function()
{
    

    ctx.drawImage( artindex.background.image, 0,0 );

    render_buttons();

    render_health();
  
    //render question 
    ctx.font = "bold 70px/80px Arial Rounded MT Bold";
    ctx.fillStyle = "rgb(256, 256, 256)";
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    ctx.fillText( question.text, 512, 500 );
};

var render_charselect = function()
{
    ctx.drawImage( artindex.background.image, 0,0  );

    render_buttons();
};

var do_damage = function( player_index )
{
    playerstate[player_index].health -= 0.1;

    if(player_index == 1)
    {
        audioindex.excellent.audio.play();
    }
    else
    {
        audioindex.wickedsick.audio.play();
    }
}

var set_gameplaystate = function( state )
{
    statechange_time = Date.now();
    gameplay_state = state;
};

var time_in_gameplaysate = function()
{
    return Date.now() - statechange_time;
}

var orb_click_closure = function( orb )
{

    return function()
    {
        if( gameplay_state == 'selecting' && picked_orbs.indexOf( orb ) < 0 )
        { 
            picked_orbs.push( orb );

            for(var i = 0; i < 5; i++)
            {
                var index = orb_columns[i].indexOf(orb);
                if( index >= 0 )
                 {
                    orb_columns[i].splice(index,1);
                    orb_hopper.push(orb.text);

                    var replacement_orb = gen_orb();
                    orb_columns[i].push(  replacement_orb );
                }
            }

            if(picked_orbs.length >= 2)
            {
                set_gameplaystate( "evaluating" );
                evaluate_answer();
            }
        }
    }

};

var evaluate_answer = function()
{
    var picked_answer = picked_orbs[0].text + picked_orbs[1].text;
    if(picked_answer == question.answer)
    {
        do_damage(1);
    }
    else
    {
        do_damage(0);
    }
};

var gen_orb = function()
{
    var color = orb_colors[Math.floor(Math.random() * orb_colors.length)];

    
    var pick_index = Math.floor(Math.random() * orb_hopper.length);
    var hopper_pick = orb_hopper[ pick_index ];
    orb_hopper.splice(pick_index, 1);

    var image = artindex[orb_colors_map[color]];
    var orb = { "image": image,
                "text": hopper_pick.toString(),
                "width": image.image.width,
                "height": image.image.height
                };

    orb["click"] = orb_click_closure( orb ); 

    buttons.splice(0,0, orb);

    return orb;

};

var place_orbs = function()
{

    for(var i = 0; i < 5; i++)
    {
        for(var j = 0; j < orb_columns[i].length; j++)
        {
            orb_columns[i][j].x = 312 + i * 80; 
            orb_columns[i][j].y = 370 - (j * 80); 
        }
    }

    for(var i in picked_orbs)
    {
        picked_orbs[i].y = 610;
        picked_orbs[i].x = 422 + (i * 80);
    }

};

var reset_orbs = function()
{
    //Repopulating hopper
    orb_hopper = [];
    for(var i = 0; i < 10; i++)
    {
        for(var j = 0; j < 3; j++)
        {
            orb_hopper.splice(0,0,i.toString()); 
        }
    }

    orb_columns = [ [],[],[],[],[] ];

     
    for(var i = 0; i < 5; i++)
    {
        for(var j = 0; j < 5; j++)
        {
            var orb = gen_orb(); 
            
            orb_columns[i].splice(0,0, orb);
        }
    }
    place_orbs();
};

var generate_question = function()
{
    var a1 = Math.floor( (Math.random() * 44) + 5 ); 
    var a2 = Math.floor( (Math.random() * 44) + 5 ); 

    question.text = a1.toString() + " + " + a2.toString() + " = ?";
    question.answer = (a1 + a2).toString();
    
    return question;
}

var update_gameplay = function(delta)
{
    place_orbs();
    if(gameplay_state == 'evaluating' && time_in_gameplaysate() > 1500.0)
    {

        generate_question();

        for(var i in picked_orbs)
        {
            buttons.splice( buttons.indexOf( picked_orbs[i]) , 1);
        }
        picked_orbs = [];

        set_gameplaystate('selecting');
    }
};

var reset_gameplay = function()
{
    buttons = [];
    answer_buttons = [];
    
    playerstate = [
        {"health":1.0},
        {"health":1.0}
    ];
    
    reset_orbs();

    generate_question();
    set_gameplaystate('selecting');
    gamestate = "playing"; 
};

var reset_charselect = function()
{
    buttons = [];
   
    image = artindex.newton; 
    button = {"image": image, 
                "x": 200,
                "y": 200, 
                "width":image.image.width,
                "height":image.frame_height,
                "click": function(){ 
                        character_select = "newton"; 
                        player_image = artindex.newton;
                        enemy_image = artindex.einstein;
                        reset_lobby();
                    } 
                };

    buttons.splice( 0, 0, button);

    image = artindex.archimedes; 
    button = {"image": image, 
                "x": 450,
                "y": 200, 
                "width":image.image.width,
                "height":image.frame_height,
                "click": function(){ 
                        character_select = "archimedes"; 
                        player_image = artindex.archimedes;
                        enemy_image = artindex.einstein;
                        reset_lobby();
                    } };

    buttons.splice( 0, 0, button);

    image = artindex.einstein; 
    button = {"image": image, 
                "x": 700,
                "y": 200, 
                "width":image.image.width,
                "height":image.frame_height,
                "click": function(){ 
                        character_select = "einstein"; 
                        player_image = artindex.einstein;
                        enemy_image = artindex.archimedes;
                        reset_lobby();
                    } };

    buttons.splice( 0, 0, button);

    gamestate = 'charselect';
};

var render_intro = function()
{
    ctx.drawImage( artindex.background.image, 0,0 );

    render_buttons();
};

var reset_intro = function()
{
    buttons = [];
    
    button = {"image": artindex.logo_deathmath_nobuttons, 
                "x": 138,
                "y": 138, 
                "width":artindex.logo_deathmath_nobuttons.image.width,
                "height":artindex.logo_deathmath_nobuttons.image.height,
                "click":reset_charselect };
    
    buttons.splice( 0, 0, button);

    gamestate = 'intro';
};

var join_closure = function( )
{
    return function( data )
    {
        joiner.waiting = true; 
    }
};

var lobby_searching = false;
var match_found = false;
var check_counter = 0;

var update_lobby = function(delta)
{
  if(!match_found) {
    if(lobby_searching) {
      if(match_found) {
        reset_lobby();
      } else {
        if(check_counter*delta > 200) {
          $.ajax({ url: "http://localhost:3000/match/status/" + guid + ".js",
                   dataType: "jsonp",
                   success: function(data){ 
                     if(data.matched) {
                       match_found = true;
                       channel = data.channel;
                       alert("connected!!!");

                       PUBNUB.subscribe({
                           channel  : data.guid,
                           callback : function(message) { alert(message); }
                       });

                       PUBNUB.publish({
                           channel  : data.guid,
                           message : "hello"
                       });
                     }
                   }
          });
          check_counter = 0;
        }
        check_counter = check_counter + 1;
      }
    } else {
      $.ajax({ url: "http://localhost:3000/match/join/" + guid + ".js",
               dataType: "jsonp",
               success: function(data){ 
                 lobby_searching = true;
               }
      });
    }
  } else {
    reset_gameplay();
  }
};

var render_lobby = function()
{
    ctx.drawImage( artindex.background.image, 0,0  );

    ctx.font = "bold 100px/120px Arial Rounded MT Bold";
    ctx.fillStyle = "white";
    ctx.fillText( "Loading...", 300, 300 );
};

var reset_lobby = function()
{
    gamestate = 'lobby';
};

var render_buttons = function()
{
    for( var i = 0; i < buttons.length; i++)
    {
        button = buttons[i]; 
        if(button.image)
        {
            ctx.drawImage( button.image.image, 0,0, button.width, button.height, button.x, button.y, button.width, button.height  );
        }
        else
        {
            ctx.fillStyle = "rgb(128, 128, 128)";
            ctx.fillRect( button.x, button.y, button.width, button.height );
        }
        if(button.text)
        {
            ctx.font = "bold 50px/60px Arial Rounded MT Bold";
            ctx.fillStyle = "rgb(256, 256, 256)";
            ctx.textBaseline = "top";
            ctx.textAlign = "center";
            ctx.fillText( button.text, button.x + (button.width / 2.0), button.y + (button.height * 0.125), button.width );
        }
    }
};

var click_check = function( e, button )
{
    if(e.x < button.x)  
    {
        return false;
    }
    if(e.x > button.x + button.width)  
    {
        return false;
    }
    if(e.y < button.y)  
    {
        return false;
    }
    if(e.y > button.y + button.height)  
    {
        return false;
    }

    return true;
};

var canvas_click = function(e)
{
    for( var i = 0; i < buttons.length; i++)
    {
        button = buttons[i]; 
        if( click_check(e, button) )
        {
            if(button.click)
            {
                button.click();
                return;
            }
        }
    }
};

var then = Date.now();

// The main game loop
var main = function () {
	var now = Date.now();
	var delta = now - then;

    if(gamestate == 'intro')
    {
	    render_intro();
    }
    else if(gamestate == 'charselect')
    {
	    render_charselect();
    }
    else if(gamestate == 'lobby')
    {
        update_lobby(delta);
	    render_lobby();
    }
    else if(gamestate == 'playing')
    {
        update_gameplay(delta);
        render_gameplay();
    }
    else
    {
        if( artloaded( artindex ) )
        {
            reset_intro();
        }
    }

	then = now;
};
loadart( artindex );
load_audio( audioindex );
setInterval(main, 300);
canvas.onclick = canvas_click;

reset_lobby = reset_gameplay;
theme_song.play();
