class MatchController < ApplicationController

  def join
    Resque.enqueue(Match, params[:id])
    render :json => {:id => 12345}
  end
end
