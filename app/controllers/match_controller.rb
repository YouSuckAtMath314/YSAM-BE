class MatchController < ApplicationController

  def join
    id = params[:id]
    oppenent_id = $redis.hdel "games", id
    user_params = params.reject{|k| ["id", "controller", "action"].include?(k) }
    logger.debug "user_params = #{user_params.inspect}"
    $redis.hdel "games", oppenent_id
    $redis.hdel "channels", id
    $redis.hdel "channels", oppenent_id
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
        oppenent_id = $redis.spop "lobby"
        $redis.hset "games", id, oppenent_id
        $redis.hset "games", oppenent_id, id
        guid = Guid.new.to_s
        $redis.hset "channels", id, guid.to_s
        $redis.hset "channels", oppenent_id, guid.to_s
        render :json => {:matched => true, :id => oppenent_id, :guid => guid.to_s, :user => user.params}
      else
        render :json => {:matched => false}
      end
    elsif $redis.hexists "games", id
      oppenent_id = $redis.hget "games", id
      guid = $redis.hget "channels", id
      render :json => {:matched => true, :id => oppenent_id, :guid => guid}
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

end
