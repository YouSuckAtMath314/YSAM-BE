class MatchController < ApplicationController

  def join
    $redis.sadd("lobby", params[:id])
    render :json => {:id => params[:id]}
  end

  def status
    if $redis.sismember "lobby", params[:id]
      if $redis.scard("lobby") > 1
        $redis.srem "lobby", params[:id]
        oppenent_id = $redis.spop "lobby"
        render :json => {:matched => true, :id => oppenent_id}
      else
        render :json => {:matched => false}
      end
    else # already matched
      render :json => {:matched => true}
    end
  end
end
