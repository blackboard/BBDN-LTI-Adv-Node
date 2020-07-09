import React from 'react';
import { Stack, Text, FontWeights, PrimaryButton, DefaultButton } from 'office-ui-fabric-react';
import { AppState } from './RootReducer'
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { goBack } from 'connected-react-router';
import { localizedComponentWrapper } from 'react-babelfish';
import { AssignmentInput } from './assignment-creator/models';
import { CREATE_ASSIGNMENT_COMMAND, CreateAssignmentCommand } from './assignment-creator/actions';

const semiboldStyle = { root: { fontWeight: FontWeights.semibold } };

interface ErrorPageProps {
  assignment: AssignmentInput,
  goBack: () => void,
  createAssignment: (assignment: AssignmentInput) => void,
  localize: any
}

const mapStateToProps = (state : AppState) => ({
  stream: state.assignment.inputAssignment,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  goBack: () => dispatch(goBack()),
  createAssignment: (assignment: AssignmentInput) => {
    dispatch({
      type: CREATE_ASSIGNMENT_COMMAND,
      fromPage: "error",
      assignment: assignment,
    } as CreateAssignmentCommand)
  }
});

function ErrorPageComponent(props: ErrorPageProps) {
  return (
    <Stack
      className="container"
      horizontalAlign="center"
      verticalAlign="center"
      verticalFill
      tokens={{
        childrenGap: 35
      }}>
      <img
        className="splashImage"
        src="https://statics.teams.microsoft.com/hashedassets-launcher/launcher_streams_new.b2c45282207c2dff1f96b89f128a7e31.svg"
        alt="logo"
      />
      <Text variant="xxLarge" styles={semiboldStyle}>
        Oops! Your stream wasn't created successfully.
      </Text>
      <Text variant="large" className="uTextCenter">
        Please try again. If the problem persists, check with your IT administrator to ensure you have the proper permissions.
      </Text>
      <Stack horizontal tokens={{childrenGap: 10}}>
        <DefaultButton
          className="teamsButtonInverted"
          text="Back"
          onClick={(event) => props.goBack()} 
          ariaLabel="Back to last screen"
        />
        <PrimaryButton
          className="teamsButton"
          primary text="Try again" 
          onClick={(event) => props.createAssignment(props.assignment)}
          ariaLabel="Try again"
        />
      </Stack>
    </Stack>
  );
}

export default localizedComponentWrapper(connect(mapStateToProps, mapDispatchToProps)(ErrorPageComponent));