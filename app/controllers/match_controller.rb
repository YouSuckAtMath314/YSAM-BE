class MatchController < ApplicationController

  def join
    id = params[:id]
    opponent_id = $redis.hdel "games", id
    $redis.hdel "games", opponent_id
    $redis.hdel "channels", id
    $redis.hdel "channels", opponent_id
    $redis.sadd "lobby", id
    user = User.find(id)
    if user
      user.params = user_params
    else
      user = User.new(id, user_params)
    end
    user.save
    render :json => {:id => params[:id], :user => user.params}
  end

  def status
    id = params[:id]
    user = User.find(id)
    if $redis.sismember "lobby", id
      if $redis.scard("lobby") > 1
        $redis.srem "lobby", id
        opponent_id = $redis.spop "lobby"
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
        render :json => {:matched => false}
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
      render :json => {:matched => false}
    end
  end

  def user
    id = params[:id]
    user = User.find(params[:id])
    render :json => {:user => user}
  end

  def lobby
    members = $redis.smembers "lobby"
    render :json => {:lobby => members}
  end

  def games
    games = $redis.hgetall "games"
    render :json => {:games => games}
  end

  def channels
    channels = $redis.hgetall "channels"
    render :json => {:channels => channels}
  end

  private

  def user_params
   params.reject{|k| ["id", "controller", "action", "callback", "format"].include?(k) }
  end

end
