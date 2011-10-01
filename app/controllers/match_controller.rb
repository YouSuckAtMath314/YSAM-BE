class MatchController < ApplicationController

  def join
    render :json => {:joined => true}
  end
end
