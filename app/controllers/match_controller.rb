class MatchController < ApplicationController

  def join
    id = params[:id]
    opponent_id = $redis.hdel "games", id
    $redis.hdel "games", opponent_id
    $redis.hdel "channels", id
    $redis.hdel "channels", opponent_id
    $redis.sadd "lobby", id
    $redis.set "lobby/connect-time:#{id}", Time.now.to_i
    user = User.find(id)
    if user
      user.params = user_params
    else
      user = User.new(id, user_params)
    end
    user.save
    render_json({:id => params[:id], :user => user.params})
  end

  def status
    id = params[:id]
    user = User.find(id)
    if $redis.sismember "lobby", id
      if $redis.scard("lobby") > 1
        $redis.srem "lobby", id
        opponent_id = nil
        opponent_id = $redis.sort("lobby", :by => "lobby/connect-time:*", :limit => [0,1]).first
        $redis.srem "lobby", opponent_id
        opponent = User.find(opponent_id)
        $redis.hset "games", id, opponent_id
        $redis.hset "games", opponent_id, id
        guid = Guid.new.to_s
        $redis.hset "channels", id, guid.to_s
        $redis.hset "channels", opponent_id, guid.to_s
        render :json => {:matched => true, 
                         :id => id,
                         :opponent_id => opponent_id, 
                         :guid => guid.to_s, 
                         :user => user.params,
                         :opponent => opponent.params}
      else
        render_json({:matched => false})
      end
    elsif $redis.hexists "games", id
      opponent_id = $redis.hget "games", id
      opponent = User.find(opponent_id)
      guid = $redis.hget "channels", id
      render :json => {:matched => true, 
                       :id => id,
                       :opponent_id => opponent_id, 
                       :guid => guid.to_s, 
                       :user => user.params,
                       :opponent => opponent.params}
    else
      render_json(:matched => false)
    end
  end

  def user
    id = params[:id]
    user = User.find(params[:id])
    render_json({:user => user})
  end

  def lobby
    members = $redis.smembers "lobby"
    render_json({:lobby => members})
  end

  def games
    games = $redis.hgetall "games"
    render_json({:games => games})
  end

  def channels
    channels = $redis.hgetall "channels"
    render_json({:channels => channels})
  end

  private

  def user_params
   params.reject{|k| ["id", "controller", "action", "callback", "format"].include?(k) }
  end

  def render_json(object)
    respond_to do |format|
      format.json{ render :json => object }
      format.js{ render :json => object, :callback => params[:callback]}
    end
  end
end
