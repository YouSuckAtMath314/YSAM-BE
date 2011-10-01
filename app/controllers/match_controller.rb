class MatchController < ApplicationController

  def join
    id = params[:id]
    oppenent_id = $redis.hdel "games", id
    $redis.hdel "games", oppenent_id
    $redis.hdel "channels", id
    $redis.hdel "channels", oppenent_id
    $redis.sadd "lobby", id
    render :json => {:id => params[:id]}
  end

  def status
    id = params[:id]
    if $redis.sismember "lobby", id
      if $redis.scard("lobby") > 1
        $redis.srem "lobby", id
        oppenent_id = $redis.spop "lobby"
        guid = Guid.new.to_s
        $redis.hset "channels", id, guid
        $redis.hset "channels", oppenent_id, guid
        $redis.hset "games", id, oppenent_id
        $redis.hset "games", oppenent_id, id
        render :json => {:matched => true, :id => oppenent_id, :guid => guid}
      else
        render :json => {:matched => false}
      end
    elsif $redis.hexists "games", id
      oppenent_id = $redis.hget "games", id
      guid = $redis.hget "channels", id
      logger.debug "guid = #{guid}"
      render :json => {:matched => true, :id => oppenent_id, :guid => guid}
    else
      render :json => {:matched => false}
    end
  end
end
