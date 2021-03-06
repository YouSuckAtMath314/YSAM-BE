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
    {"health":0.4, "power": {"R":0, "G":0, "B":0, "Y":0} },
    {"health":0.8, "power": {"R":0, "G":0, "B":0, "Y":0} },
]

var statechange_time = Date.now();

var victory_state = 'win';
var gamestate = 'loading';
var gameplay_state = 'selecting';

var player_image = null;
var enemy_image = null;
var player_name = null;
var enemy_name = null;

var orb_hopper = [];
var orb_columns= [];
var orb_colors = [ "R", "G", "B", "Y"];
var orb_colors_map = {
     "R": "effects_orb_red",
     "G": "effects_orb_green",
     "B": "effects_orb_blue",
     "Y": "effects_orb_yellow"
};

var enemy_ai = null;

powers = [
    {
        "name": "Particle Punch",
        "apply": function(attacker_state, enemy_state){ enemy_state.health -= 0.2; },
        "cost": { "R": 2, "G": 0, "B": 0, "Y": 0 }       
    },
    {
        "name": "Mass Impulse",
        "apply": function(attacker_state, enemy_state){ enemy_state.health -= 0.3; },
        "cost": { "R": 1, "G": 3, "B": 0, "Y": 0 } 
    },      
    {
        "name": "Brain Drain",
        "apply": function(attacker_state, enemy_state){ enemy_state.power.R = 0; },
        "cost": { "R": 0, "G": 2, "B": 2, "Y": 2 } 
    },      
    {
        "name": "Heal",
        "apply": function(attacker_state, enemy_state){ attacker_state.health += 0.3; },
        "cost": { "R": 0, "G": 3, "B": 0, "Y": 3 } 
    },      
    {
        "name": "Mass Blast",
        "apply": function(attacker_state, enemy_state){ enemy_state.health -= 0.7; },
        "cost": { "R": 3, "G": 3, "B": 3, "Y": 3 } 
    },      
];

picked_orbs = [];

///
/// --- Gameclock
///

function GameClock(time_length){
  this.time_length = time_length;
  this.time_left = time_length;
  this.running = false;
}

GameClock.prototype.reset = function(){
  this.time_left = this.time_length;
};

GameClock.prototype.tick = function(){
  var self = this;
  setTimeout(function(){
    self.time_left = self.time_left - 1;
    if(self.running){
      if(self.time_left <= 0){
        self.running = false;
        if(self.onend){
          self.onend();
        }
      } else {
        self.tick();
      }
    }
  }, 1000);
};
GameClock.prototype.start = function(){
  this.running = true;
  this.tick();
};
GameClock.prototype.stop = function(){
  this.running = false;
};
GameClock.prototype.minutes = function(){
  return Math.floor(this.time_left / 60);
};
GameClock.prototype.seconds = function(){
  return (this.time_left % 60);
};
GameClock.prototype.zero_pad = function(number, length){
  var number_with_padding = number + "";
  while(number_with_padding.length < length){
    number_with_padding = "0" + number_with_padding;
  }
  return number_with_padding;
}
GameClock.prototype.display = function(){
  return (this.zero_pad(this.minutes(), 1) + ":" + this.zero_pad(this.seconds(), 2)); 
};

GameClock.prototype.render = function(){

    ctx.drawImage( artindex.fight.image, 470,20 );
    ctx.font = "28px/28px Arial Rounded MT Bold";
    ctx.fillStyle = "rgb(255, 255, 0)";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText( this.display(), 480, 70);

};

//
// --- Button
//

function Button(image, x, y, width, height){

    this.image = image;
    this.width = width
    this.height = height;
    this.x = x;
    this.y = y;
    this.animations = {};
}

Button.prototype.render = function()
{
    ctx.drawImage( this.image.image, 0,0, this.width, this.height, this.x, this.y, this.width, this.height  );

    if(this.text)
    {
        ctx.font = "bold 50px/60px Arial Rounded MT Bold";
        ctx.fillStyle = "rgb(256, 256, 256)";
        ctx.textBaseline = "top";
        ctx.textAlign = "center";
        ctx.fillText( this.text, this.x + (this.width / 2.0), this.y + (this.height * 0.125), this.width );
    }
};

Button.prototype.update = function()
{
    for(var v in this.animations)
    {
        var ani = this.animations[v];
        var t = now - ani.start_time;
        var progress = t / ani.length;
    
        var value = ani.end;

        if(progress < 1.0)
        {
            value = ani.start + ((ani.end - ani.start) * progress);
        }     
        
        this[v] = value;
    }
};

//
// --- Orb
//

Orb.prototype = new Button();
Orb.prototype.constructor = Orb;

function Orb(image, text, width, height, color){
    Button.call(this, image, 512,-512, width, height)
    this.color = color
    this.text = text;
}

Orb.prototype.click = function()
{
    if( gameplay_state == 'selecting' && picked_orbs.indexOf( this ) < 0 )
    { 
        picked_orbs.push( this );

        for(var i = 0; i < 5; i++)
        {
            var index = orb_columns[i].indexOf(this);
            if( index >= 0 )
             {
                orb_columns[i].splice(index,1);
                orb_hopper.push(this.text);

                var replacement_orb = gen_orb();
                orb_columns[i].push(  replacement_orb );
            }
        }

        if(picked_orbs.length >= 2)
        {
            set_gameplaystate( "evaluating" );
        }
        place_orbs();
    }

};

//
// --- PowerButton
//

PowerButton.prototype = new Button();
PowerButton.prototype.constructor = PowerButton;

function PowerButton(x,y, width, height, power, player, enabled){
    Button.call(this, null, x, y, width, height)
    this.power = power;
    this.is_available = false;
    this.player = player;
    this.enabled = enabled;
}

PowerButton.prototype.render = function()
{
    if( this.is_available )
    {
        ctx.fillStyle = "rgb(128, 196, 128)";
    }
    else
    {
        ctx.fillStyle = "rgb(128, 128, 128)";
    }
    ctx.fillRect( this.x, this.y, this.width, this.height );

    ctx.font = "bold 20px/20px Arial Rounded MT Bold";
    ctx.fillStyle = "rgb(256, 256, 256)";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText( this.power.name, this.x + (10), this.y + (this.height * 0.125), this.width );

    render_power( this.power.cost, this.x + 10, this.y + 50, false);

};

PowerButton.prototype.update = function( timeDelta )
{
    this.is_available = power_gte( this.player.power, this.power.cost );
};

var apply_attack = function( power, attacker, attackee )
{
    power.apply( attacker, attackee );

    for(var c in orb_colors)
    {
        var color = orb_colors[c];
        attacker.power[color] -= power.cost[color];
    } 

    check_for_victory();
};

PowerButton.prototype.click = function()
{
    var sufficient_power = power_gte( playerstate[0].power, this.power.cost );

    if( this.enabled && sufficient_power )
    {
        apply_attack(this.power, playerstate[0], playerstate[1] );
    }
};

function EnemyAI()
{
    this.ellapsed_time = 0;
    this.num_answers = 1;
    this.num_attackchecks = 0;
};

EnemyAI.prototype.update = function( delta )
{
    this.ellapsed_time += delta;

    if( this.num_answers < (this.ellapsed_time / 10000) )
    {
        this.num_answers++;

        for(var i = 0; i < 2; i++)
        {
            var color = orb_colors[Math.floor(Math.random() * orb_colors.length)];
            playerstate[1].power[color] += 1;
        }
    }

    if( this.num_attackchecks < ((this.ellapsed_time - 5000) / 10000) )
    {
        this.num_attackchecks++;

        for(var i in powers)
        {
            var power = powers[i];

            var sufficient_power = power_gte( playerstate[1].power, power.cost );
            if( sufficient_power )
            {
                apply_attack( power, playerstate[1], playerstate[0] );
            }
        }
    }
};

var game_clock = new GameClock(3*60);

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
        var image = new Image();

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
        sound.loaded = false;
        sound.onload = onLoadClosure( sound ); 
        sound.src = audioindex[key].path;

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

var render_health_bar = function(x, y, health, empty_bar, full_bar, name, align)
{
    var split = Math.floor(full_bar.image.width * Math.max(0, health) );
    ctx.font = "14px/14px Arial Rounded MT Bold";
    ctx.fillStyle = "rgb(256, 256, 256)";
    ctx.textBaseline = "top";
    if(align == "right"){
      ctx.textAlign = "left";
      ctx.fillText( name, x+5, y-30 );
    } else {
      ctx.textAlign = "right";
      ctx.fillText( name, x + full_bar.image.width-5, y-30 );
    }

    if(align == "right"){
      ctx.drawImage( full_bar.image, full_bar.image.width-split, 0, split, full_bar.image.height, x+full_bar.image.width-split,y, split, full_bar.image.height );
      ctx.drawImage( empty_bar.image, 0, 0, empty_bar.image.width-split, empty_bar.image.height, x, y, empty_bar.image.width-split, empty_bar.image.height );
    } else {
      ctx.drawImage( full_bar.image, 0, 0, split, full_bar.image.height, x,y, split, full_bar.image.height );
      ctx.drawImage( empty_bar.image, split, 0, empty_bar.image.width - split, empty_bar.image.height, x+split, y, empty_bar.image.width - split, empty_bar.image.height );
    }
};

var render_avatar = function(avatar_image, x, y, health)
{
    var frame = Math.round( (1 - Math.max(0, health)) * 4);
    var topy = avatar_image.frame_height * frame;
    var height = Math.min( avatar_image.image.height - topy, avatar_image.frame_height);
    ctx.shadowOffsetX = 10;
    ctx.shadowOffsetY = 20;
    ctx.shadowColor = "rgba(0,0,0,0.30)";
    ctx.drawImage( avatar_image.image, 0, topy , avatar_image.image.width, height, x,y, avatar_image.image.width+10, height+20);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowColor = "rgba(0,0,0,0)";
};

var render_power = function(player_power, x, y, render_zeros)
{
    var offset = 0;

    for(var i in orb_colors)
    { 
        var oc = orb_colors[i];

        if( render_zeros ||  player_power[oc] > 0 )
        {
            ctx.drawImage( artindex[ orb_colors_map[oc] + "_small" ].image, x + (offset), y);
            ctx.font = "24px/24px Arial Rounded MT Bold";
            ctx.fillStyle = "rgb(256, 256, 256)";
            ctx.textBaseline = "bottom";
            ctx.textAlign = "left";
            ctx.fillText( "x " + player_power[oc].toString() , x + (25 + (offset)), y + 23);
            offset += 70;
        }
    }
};

var render_health = function()
{
    render_health_bar(130,60, playerstate[0].health, artindex.bg_health_empty, artindex.bg_health_full_red, player_name, "left");

    render_health_bar(canvas.width - artindex.bg_health_empty.image.width-130 ,60, playerstate[1].health, artindex.bg_health_empty, artindex.bg_health_full_blue, enemy_name, "right");

    render_avatar(player_image, 5, 2, playerstate[0].health );
    render_avatar(enemy_image, (canvas.width - 20 - enemy_image.image.width), 2, playerstate[1].health );

    render_power( playerstate[0].power, 20, 260, true);
    render_power( playerstate[1].power, canvas.width - 290, 260, true);
};

var render_gameplay = function()
{
    ctx.drawImage( artindex.background.image, 0,0 );

    render_buttons();

    render_health();

    game_clock.render();
    //render question 
    ctx.font = "bold 70px/80px Arial Rounded MT Bold";
    ctx.fillStyle = "rgb(256, 256, 256)";
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    ctx.fillText( question.text, 512, 600 );
};

var render_charselect = function()
{
    ctx.drawImage( artindex.background.image, 0,0  );
    ctx.drawImage( artindex.choose_fighter.image, 0,0  );

    render_buttons();
};
var check_for_victory = function()
{
    var gameover = false;
    if(playerstate[1].health <= 0)
    {
        victory_state = "win";
        gameover = true;
        reset_victory();
    }

    if(playerstate[0].health <= 0)
    {
        victory_state = "lose";
        gameover = true;
        reset_victory();
    }
    return gameover;
};

var do_damage = function( player_index )
{
    playerstate[player_index].health -= 0.1;
    
    return check_for_victory();
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

game_clock.onend = function(){
  // right now, ties let player one win
  if(playerstate[0].health >= playerstate[1].health)
  {
      victory_state = "win";
      gameover = true;
      reset_victory();
  }
  else {
      victory_state = "lose";
      gameover = true;
      reset_victory();
  }
}


var evaluate_answer = function()
{
    var picked_answer = picked_orbs[0].text + picked_orbs[1].text;

    var gameover = false;
    if(picked_answer == question.answer)
    {
        playerstate[0].power[picked_orbs[0].color] += 1;
        playerstate[0].power[picked_orbs[1].color] += 1;

        var soundindex = Math.floor(Math.random() * right_sounds.length);
        
        audioindex[right_sounds[soundindex]].audio.volume = 1.0;
        audioindex[right_sounds[soundindex]].audio.play();
    }
    else
    {
        gameover = do_damage(0);

        var soundindex = Math.floor(Math.random() * wrong_sounds.length);
        audioindex[wrong_sounds[soundindex]].audio.volume = 1.0;
        audioindex[wrong_sounds[soundindex]].audio.play();
    }
    return gameover;
};

var gen_orb = function()
{
    var color = orb_colors[Math.floor(Math.random() * orb_colors.length)];
    
    var pick_index = Math.floor(Math.random() * orb_hopper.length);
    var hopper_pick = orb_hopper[ pick_index ];
    orb_hopper.splice(pick_index, 1);

    var image = artindex[orb_colors_map[color]];
    var orb = new Orb( image, hopper_pick.toString(), image.image.width, image.image.height, color);

    buttons.splice(0,0, orb);

    return orb;

};

var place_orbs = function()
{

    for(var i = 0; i < 5; i++)
    {
        for(var j = 0; j < orb_columns[i].length; j++)
        {

            var target_x = 312 + i * 80; 
            var target_y = 510 - (j * 80); 

            if(!orb_columns[i][j].animations)
            {
                orb_columns[i][j].animations = {}
            }
            
            orb_columns[i][j].animations.y = {
                    "function" : "lerp", 
                    "start" : orb_columns[i][j].y,
                    "end" : target_y,
                    "start_time" : now,
                    "length" : 500.0
                   };

            orb_columns[i][j].animations.x = {
                    "function" : "lerp", 
                    "start" : orb_columns[i][j].x,
                    "end" : target_x,
                    "start_time" : now,
                    "length" : 500.0
                   };
        }
    }

    for(var i in picked_orbs)
    {
        var target_y = 680;
        var target_x = 422 + (i * 80);

        picked_orbs[i].animations.y = {
                "function" : "lerp", 
                "start" : picked_orbs[i].y,
                "end" : target_y,
                "start_time" : now,
                "length" : 500.0
               };

        picked_orbs[i].animations.x = {
                "function" : "lerp", 
                "start" : picked_orbs[i].x,
                "end" : target_x,
                "start_time" : now,
                "length" : 500.0
               };
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
    //Just so the top line isn't always replace with itself
    orb_hopper.push("1");
    orb_hopper.push("0");
    orb_hopper.push("5");

    orb_columns = [ [],[],[],[],[] ];

     
    for(var i = 0; i < 5; i++)
    {
        for(var j = 0; j < 6; j++)
        {
            var orb = gen_orb(); 
            
            orb_columns[i].splice(0,0, orb);
        }
    }

    for(var i = 0; i < 5; i++)
    {
        for(var j = 0; j < orb_columns[i].length; j++)
        {
            orb_columns[i][j].x = 312 + i * 80; 
            orb_columns[i][j].y = -100 - (j * 80); 
        }
    }

    picked_orbs = [];

    place_orbs();
};

var generate_question = function()
{
    var a1 = Math.floor( (Math.random() * 44) + 5 ); 
    var a2 = Math.floor( (Math.random() * 44) + 5 ); 

    question.text = a1.toString() + " + " + a2.toString() + " = ?";
    question.answer = (a1 + a2).toString();
    question.reveal = a1.toString() + " + " + a2.toString() + " = " + question.answer; 
    
    return question;
};

var update_animations = function(delta)
{

    for(var b in buttons)
    {
        var button = buttons[b];

        if(button.animations)
        {
            for(var v in button.animations)
            {
                var ani = button.animations[v];
                var t = now - ani.start_time;
                var progress = t / ani.length;
            
                var value = ani.end;

                if(progress < 1.0)
                {
                    value = ani.start + ((ani.end - ani.start) * progress);
                }     
                
                button[v] = value;
            }
        }
    }
};

var update_updateables = function( delta )
{

    for(var b in buttons)
    {
        var button = buttons[b];

        if( button.update )
        {
            button.update( delta );
        }
    }

};

var update_gameplay = function(delta)
{
    update_updateables(delta);

    enemy_ai.update( delta );
    
    update_animations();

    if(gameplay_state == 'evaluating' && time_in_gameplaysate() > 1500.0)
    {
        var gameover = evaluate_answer();

        if( !gameover )
        {
            generate_question();

            for(var i in picked_orbs)
            {
                buttons.splice( buttons.indexOf( picked_orbs[i]) , 1);
            }
            picked_orbs = [];

            set_gameplaystate('selecting');
        }
    }
};

//Power1 is greater than or equal to power to power 2
//Good for telling if 
var power_gte = function( power1, power2)
{
    var result = true;

    for(var c in orb_colors)
    {
        var color = orb_colors[c];

        if(power1[color] < power2[color])
        {
            result = false;
        }       
    } 

    return result;

};

var generate_powerbuttons = function(powers, x, y, player, enabled)
{
    for(var i in powers)
    {
        var power = powers[i];

        var button = new PowerButton(   x,
                                    y + (90 * i), 
                                    280,
                                    80,
                                    power,
                                    player, enabled)

        buttons.push(button);
    }
}

var reset_gameplay = function()
{
    buttons = [];
    answer_buttons = [];
    picked_orbs = [];
    
    playerstate = [
        {"health":1.0, "power": {"R":0, "G":0, "B":0, "Y":0} },
        {"health":1.0, "power": {"R":0, "G":0, "B":0, "Y":0} }
    ];

    enemy_ai = new EnemyAI();    

    reset_orbs();
    game_clock.reset();
    game_clock.start();

    generate_question();
    generate_powerbuttons( powers, 20, 290, playerstate[0], true);
    generate_powerbuttons( powers, 724, 290, playerstate[1], false);

    set_gameplaystate('selecting');

    gamestate = "playing"; 
};

var reset_charselect = function()
{
    buttons = [];
   
    image = artindex.avatar_newton; 
    var button = new Button( image, 50, 100, image.image.width, image.image.height);
    button.click = function(){ 
                        character_select = "newton"; 
                        player_image = artindex.newton;
                        player_name = "ISAAC NEWTON";
                        enemy_image = artindex.einstein;
                        enemy_name = "ALBERT EINSTEIN";
                        reset_lobby();
                    };

    buttons.splice( 0, 0, button);

    image = artindex.avatar_archimedes; 
    var button = new Button( image, 325, 100, image.image.width, image.image.height);
    button.click = function(){ 
                        character_select = "archimedes"; 
                        player_image = artindex.archimedes;
                        player_name = "ARCHIMEDES";
                        enemy_image = artindex.einstein;
                        enemy_name = "ALBERT EINSTEIN";
                        reset_lobby();
                     };

    buttons.splice( 0, 0, button);

    image = artindex.avatar_einstein; 
    var button = new Button( image, 550, 100, image.image.width, image.image.height);
    button.click= function(){ 
                        character_select = "einstein"; 
                        player_image = artindex.einstein;
                        player_name = "ALBERT EINSTEIN";
                        enemy_image = artindex.archimedes;
                        enemy_name = "ARCHIMEDES";
                        reset_lobby();
                    };

    buttons.splice( 0, 0, button);

    gamestate = 'charselect';
};

var render_intro = function()
{
    ctx.drawImage( artindex.background.image, 0,0 );

    render_buttons();
};

var reset_victory = function()
{
    buttons = [];

    theme_song.pause();
    
    if(victory_state == "win")
    {
        var image = artindex.results_won; 

        var button = new Button( image, 138, 138, image.image.width, image.image.height);
        button.click = reset_intro;
        
        buttons.splice( 0, 0, button);

        audioindex.ludicrouskill.audio.play();
    }
    else
    {
        var image = artindex.results_lost; 
        
        var button = new Button( image, 138, 138, image.image.width, image.image.height);
        button.click = reset_intro;

        buttons.splice( 0, 0, button);

        audioindex.yousuck.audio.play();
    }
    gamestate = "victory";
};


var reset_intro = function()
{
    buttons = [];
    var button = new Button(artindex.logo_deathmath_nobuttons, 
                        138,
                        138, 
                        artindex.logo_deathmath_nobuttons.image.width,
                        artindex.logo_deathmath_nobuttons.image.height);
    button.click = reset_charselect;

    buttons.splice( 0, 0, button);

    theme_song.pause();
    theme_song.volume = 0.35;
    theme_song.currentTime = 0.0;    
    theme_song.loop = true;

//    theme_song.play();

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
        if(button.render || button.__proto__.render)
        {
            button.render();
        }
    }
};

var click_check = function( e, button )
{
    var x = e.pageX  - $("canvas").offset().left;
    var y = e.pageY - $("canvas").offset().top;
    if(x < button.x)  
    {
        return false;
    }
    if(x > button.x + button.width)  
    {
        return false;
    }
    if(y < button.y)  
    {
        return false;
    }
    if(y > button.y + button.height)  
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

var canvas_onmousedown = function(e)
{
    for( var i = 0; i < buttons.length; i++)
    {
        button = buttons[i]; 
        if( click_check(e, button) )
        {
            if(button.onmousedown)
            {
                button.onmousedown();
                return;
            }
        }
    }
};

var then = Date.now();
var now = Date.now();

// The main game loop
var main = function () {
	now = Date.now();
	var delta = now - then;

    if(gamestate == 'intro' || gamestate == 'victory' )
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
setInterval(main, 30);
canvas.onmousedown = canvas_click;

reset_lobby = reset_gameplay;
