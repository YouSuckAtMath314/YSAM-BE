class MatchController < ApplicationController

  def join
    $redis.sadd("lobby", params[:id])
    render :json => {:id => params[:id]}
  end

  def status
    id = params[:id]
    if $redis.sismember "lobby", id
      if $redis.scard("lobby") > 1
        $redis.srem "lobby", id
        oppenent_id = $redis.spop "lobby"
        $redis.hset "games", id, oppenent_id
        $redis.hset "games", oppenent_id, :id
        render :json => {:matched => true, :id => oppenent_id}
      else
        render :json => {:matched => false}
      end
    elsif $redis.hexists "games", id
      oppenent_id = $redis.hget "games", id
      render :json => {:matched => true, :id => oppenent_id}
    else
      render :json => {:matched => false}
    end
  end
end
