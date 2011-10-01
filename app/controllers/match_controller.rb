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
    $redis.hset "users", id, user_params.to_json
    render :json => {:id => params[:id], :user => user_params}
  end

  def status
    id = params[:id]
    user = $redis.hget("users", id)
    if user
      user_params = ActiveSupport::JSON.decode($redis.hget("users", id))
    end
    if $redis.sismember "lobby", id
      if $redis.scard("lobby") > 1
        $redis.srem "lobby", id
        oppenent_id = $redis.spop "lobby"
        $redis.hset "games", id, oppenent_id
        $redis.hset "games", oppenent_id, id
        guid = Guid.new.to_s
        $redis.hset "channels", id, guid.to_s
        $redis.hset "channels", oppenent_id, guid.to_s
        render :json => {:matched => true, :id => oppenent_id, :guid => guid.to_s, :user => user_params}
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
end
